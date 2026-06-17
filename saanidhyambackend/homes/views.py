from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q, Count
from django.db import connection
from django.http import FileResponse
from django.conf import settings
import os
import logging
import uuid

from .models import OldAgeHome, UploadJob
from .serializers import OldAgeHomeSerializer, UploadJobSerializer
from .services.data_processor import DataProcessor
from .services.pincode_geocoder import PincodeGeocoder

# PDF Generation imports
from io import BytesIO
import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
)
from reportlab.pdfgen import canvas

# Letterhead PDF overlay imports
from pypdf import PdfReader, PdfWriter

# --- HELPER FUNCTION FOR PDF CONTENT ---
def _build_content_pdf(homes_data, fields, ticket_id) -> BytesIO:
    """
    Build the inner content PDF (no letterhead), one page per home.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=0.5 * inch,
        leftMargin=0.5 * inch,
        topMargin=1.5 * inch,
        bottomMargin=1.2 * inch, 
    )

    story = []
    styles = getSampleStyleSheet()

    # Custom Styles
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#5D6F47'),
        spaceAfter=12,
        spaceBefore=12,
        fontName='Helvetica-Bold',
    )

    cell_label_style = ParagraphStyle(
        'CellLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
    )

    cell_value_style = ParagraphStyle(
        'CellValue',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=12,
        wordWrap='CJK',
    )

    # --- Total Homes BIG, GREEN, and CENTERED ---
    total_homes_style = ParagraphStyle(
        'TotalHomes',
        parent=styles['Normal'],
        fontSize=18,
        alignment=1, # Center
        textColor=colors.HexColor('#5D6F47'), # Satoru Green
        fontName='Helvetica-Bold',
        spaceAfter=20,
    )
    story.append(Paragraph(f"Total Homes: {len(homes_data)}", total_homes_style))

    for idx, home in enumerate(homes_data, 1):
        story.append(Paragraph(f"Home #{idx}", heading_style))

        table_data = []

        # Helper to safely get string values
        def get_safe(key, default=''):
            val = home.get(key)
            return str(val) if val is not None else default

        # 1. Organization Name
        if fields.get('name'):
            table_data.append([
                Paragraph('Organization Name:', cell_label_style),
                Paragraph(get_safe('organisation_name', 'N/A'), cell_value_style),
            ])

        # 2. Location & Map Link
        if fields.get('location'):
            city = get_safe('city_town_mandal')
            district = get_safe('district')
            state = get_safe('state')
            location_text = ', '.join(filter(None, [city, district, state])) or 'N/A'
            
            # --- Map Location Link ---
            map_url = home.get('map_location')
            # If no direct URL, try building one from lat/long
            if not map_url and home.get('latitude') and home.get('longitude'):
                map_url = f"https://www.google.com/maps?q={home['latitude']},{home['longitude']}"
            
            location_content = [Paragraph(location_text, cell_value_style)]
            
            if map_url:
                # Add clickable link
                link_html = f'<link href="{map_url}" color="blue"><u>View on Google Maps</u></link>'
                location_content.append(Spacer(1, 3))
                location_content.append(Paragraph(link_html, cell_value_style))

            table_data.append([
                Paragraph('Location:', cell_label_style),
                location_content # List of flowables for the cell
            ])

        if fields.get('address') and home.get('address'):
            table_data.append([
                Paragraph('Address:', cell_label_style),
                Paragraph(get_safe('address'), cell_value_style),
            ])

        if fields.get('contact') and home.get('contact_number'):
            contacts = home.get('contact_number', [])
            if isinstance(contacts, list):
                phones = ', '.join(map(str, contacts))
            else:
                phones = str(contacts)
            if phones:
                table_data.append([
                    Paragraph('Phone:', cell_label_style),
                    Paragraph(phones, cell_value_style),
                ])

        if fields.get('email') and home.get('email'):
            emails_raw = home.get('email', [])
            if isinstance(emails_raw, list):
                emails = ', '.join(map(str, emails_raw))
            else:
                emails = str(emails_raw)
            if emails:
                table_data.append([
                    Paragraph('Email:', cell_label_style),
                    Paragraph(emails, cell_value_style),
                ])

        if fields.get('website') and home.get('website'):
            web_raw = home.get('website', [])
            if isinstance(web_raw, list):
                websites = ', '.join(map(str, web_raw))
            else:
                websites = str(web_raw)
            if websites:
                table_data.append([
                    Paragraph('Website:', cell_label_style),
                    Paragraph(websites, cell_value_style),
                ])

        # --- UPDATED: Services (Service Type, Care Type, Gender) ---
        if fields.get('services'):
            service_type = get_safe('services_type', 'N/A')
            care_type = get_safe('care_type', 'N/A')
            gender = get_safe('gender', 'N/A')
            
            # Use cleaner string formatting to fix indentation issues
            services_html = (
                f"<b>Service Type:</b> {service_type}<br/>"
                f"<b>Care Type:</b> {care_type.title()}<br/>"
                f"<b>Gender:</b> {gender.title()}"
            )
            
            table_data.append([
                Paragraph('Service Details:', cell_label_style),
                Paragraph(services_html, cell_value_style),
            ])

        if fields.get('pricing'):
            costing_type = get_safe('costing_type', 'N/A')
            pricing = f"Type: {costing_type.replace('_', ' & ').title()}"

            min_charge = home.get('monthly_charges_minimum')
            max_charge = home.get('monthly_charges_maximum')

            if min_charge or max_charge:
                price_range = ""
                if min_charge:
                    price_range += f"Rs. {min_charge}"
                if max_charge:
                    price_range += f" - Rs. {max_charge}"
                pricing += f" | {price_range}/month"

            table_data.append([
                Paragraph('Pricing:', cell_label_style),
                Paragraph(pricing, cell_value_style),
            ])

        if fields.get('notes') and home.get('notes'):
            notes_text = get_safe('notes')
            display_notes = notes_text[:300]
            if len(notes_text) > 300:
                display_notes += '...'
            table_data.append([
                Paragraph('Notes:', cell_label_style),
                Paragraph(display_notes, cell_value_style),
            ])

        if table_data:
            table = Table(table_data, colWidths=[1.7 * inch, 4.8 * inch])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0f0f0')),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
                ('ALIGN', (1, 0), (1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e0e0e0')),
            ]))
            story.append(table)
            story.append(Spacer(1, 0.3 * inch))

        if idx < len(homes_data):
            story.append(PageBreak())

    # --- Footer Function (First Page Only, No Hash) ---
    def add_first_page_info(canvas, doc):
        canvas.saveState()
        
        right_x = A4[0] - 0.5 * inch 
        start_y = 1.6 * inch 
        
        # 1. Watermark Style
        canvas.setFillAlpha(0.3)
        canvas.setFillColor(colors.gray)

        # 2. Ticket ID
        if ticket_id:
            canvas.setFont('Helvetica-Bold', 9) 
            canvas.drawRightString(right_x, start_y, f"TID: {ticket_id}")
            start_y -= 10

        # 3. Export Details
        canvas.setFont('Helvetica', 8)
        date_str = datetime.datetime.now().strftime('%d-%b-%Y %H:%M')
        canvas.drawRightString(right_x, start_y, f"Exp: {date_str}")
        
        canvas.restoreState()

    # onLaterPages is missing, so this only runs on page 1
    doc.build(story, onFirstPage=add_first_page_info)
    buffer.seek(0)
    return buffer


class OldAgeHomeViewSet(viewsets.ModelViewSet):
    """
    API viewset for Old Age Homes
    """
    queryset = OldAgeHome.objects.all()
    serializer_class = OldAgeHomeSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['state', 'district', 'services_type', 'costing_type', 'gender', 'care_type']
    search_fields = ['organisation_name', 'address', 'state', 'district', 'city_town_mandal']
    ordering_fields = ['created_at', 'organisation_name']
    ordering = ['-created_at']
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'search', 'autocomplete', 'nearby', 'stats']:
            return [AllowAny()]
        return [IsAuthenticated()]
    
    @action(detail=False, methods=['get'])
    def autocomplete(self, request):
        query = request.query_params.get('q', '').strip()
        limit = int(request.query_params.get('limit', 10))
        
        if len(query) < 2:
            return Response({'suggestions': []})
        
        suggestions = []
        seen = set()
        
        # 1. Search by organization name
        orgs = OldAgeHome.objects.filter(
            organisation_name__icontains=query
        ).values('id', 'organisation_name', 'city_town_mandal', 'district', 'state')[:5]
        
        for org in orgs:
            key = org['organisation_name']
            if key not in seen:
                seen.add(key)
                location_parts = [org['city_town_mandal'], org['district'], org['state']]
                location = ', '.join([p for p in location_parts if p])
                
                suggestions.append({
                    'type': 'facility',
                    'name': org['organisation_name'],
                    'location': location,
                    'id': org['id']
                })
        
        # 2. Search by city/town/mandal
        cities = OldAgeHome.objects.filter(
            city_town_mandal__icontains=query
        ).exclude(
            city_town_mandal=''
        ).values('city_town_mandal', 'district', 'state').annotate(
            count=Count('id')
        ).order_by('-count')[:3]
        
        for city in cities:
            key = f"{city['city_town_mandal']}, {city['district']}"
            if key not in seen:
                seen.add(key)
                suggestions.append({
                    'type': 'location',
                    'name': city['city_town_mandal'],
                    'location': f"{city['district']}, {city['state']}",
                    'count': city['count']
                })
        
        # 3. Search by district
        districts = OldAgeHome.objects.filter(
            district__icontains=query
        ).values('district', 'state').annotate(
            count=Count('id')
        ).order_by('-count')[:3]
        
        for dist in districts:
            key = f"{dist['district']}, {dist['state']}"
            if key not in seen:
                seen.add(key)
                suggestions.append({
                    'type': 'location',
                    'name': dist['district'],
                    'location': dist['state'],
                    'count': dist['count']
                })
        
        # 4. Search by state
        if len(query) >= 3:
            states = OldAgeHome.objects.filter(
                state__icontains=query
            ).values('state').annotate(
                count=Count('id')
            ).order_by('-count')[:2]
            
            for state_data in states:
                key = state_data['state']
                if key not in seen:
                    seen.add(key)
                    suggestions.append({
                        'type': 'location',
                        'name': state_data['state'],
                        'location': f"{state_data['count']} homes",
                        'count': state_data['count']
                    })
        
        # 5. Search by pincode
        if query.isdigit():
            pincodes = OldAgeHome.objects.filter(
                pincode__startswith=query
            ).exclude(
                pincode=''
            ).values('pincode', 'district', 'state').annotate(
                count=Count('id')
            ).order_by('-count')[:3]
            
            for pin in pincodes:
                key = pin['pincode']
                if key not in seen:
                    seen.add(key)
                    suggestions.append({
                        'type': 'pincode',
                        'name': f"Pincode {pin['pincode']}",
                        'location': f"{pin['district']}, {pin['state']}",
                        'count': pin['count']
                    })
        
        return Response({'suggestions': suggestions[:limit]})
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        query = request.query_params.get('q', '').strip()
        state = request.query_params.get('state', '')
        district = request.query_params.get('district', '')
        costing = request.query_params.get('costing', '')
        gender = request.query_params.get('gender', '')
        care_type = request.query_params.get('care_type', '')
        services_type = request.query_params.get('services_type', '')
        
        queryset = self.get_queryset()
        
        if query:
            queryset = queryset.filter(
                Q(organisation_name__icontains=query) |
                Q(address__icontains=query) |
                Q(city_town_mandal__icontains=query) |
                Q(district__icontains=query) |
                Q(state__icontains=query) |
                Q(pincode__icontains=query)
            )
        
        if state:
            queryset = queryset.filter(state__iexact=state)
        if district:
            queryset = queryset.filter(district__iexact=district)
        if costing:
            queryset = queryset.filter(costing_type=costing)
        if gender:
            queryset = queryset.filter(gender=gender)
        if care_type:
            queryset = queryset.filter(care_type=care_type)
        if services_type:
            queryset = queryset.filter(services_type__iexact=services_type)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def nearby(self, request):
        pincode = request.query_params.get('pincode', '').strip()
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        radius = float(request.query_params.get('radius', 10))
        
        # 🔥 FIX 1: Extract the search bar query ('q')
        q = request.query_params.get('q', '').strip()
        
        # Get additional filters
        services_type_param = request.query_params.get('services_type', '').strip()
        costing = request.query_params.get('costing', '').strip()
        gender = request.query_params.get('gender', '').strip()
        care_type = request.query_params.get('care_type', '').strip()
        
        services_types = []
        if services_type_param:
            services_types = [s.strip() for s in services_type_param.split(',') if s.strip()]
        
        if pincode and not (lat and lng):
            lat, lng, city, state = PincodeGeocoder.get_coordinates(pincode)
            if not lat:
                return Response(
                    {'error': f'Could not geocode pincode: {pincode}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if not lat or not lng:
            return Response(
                {
                    'error': 'Missing required parameters',
                    'required': 'Either (lat, lng) or pincode',
                    'example': '/api/homes/nearby/?pincode=500008&radius=10'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            lat = float(lat)
            lng = float(lng)
            if not (-90 <= lat <= 90 and -180 <= lng <= 180):
                raise ValueError("Invalid coordinates")
        except ValueError as e:
            return Response(
                {'error': f'Invalid coordinates: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        base_query = """
            SELECT 
                id,
                organisation_name,
                state,
                district,
                city_town_mandal,
                address,
                pincode,
                latitude,
                longitude,
                contact_number,
                email,
                website,
                costing_type,
                gender,
                care_type,
                services_type,
                monthly_charges_minimum,
                monthly_charges_maximum,
                map_location,
                ST_Distance(
                    ST_MakePoint(longitude, latitude)::geography,
                    ST_MakePoint(%s, %s)::geography
                ) / 1000 as distance_km
            FROM old_age_homes
            WHERE
                latitude IS NOT NULL
                AND longitude IS NOT NULL
                AND ST_DWithin(
                    ST_MakePoint(longitude, latitude)::geography,
                    ST_MakePoint(%s, %s)::geography,
                    %s * 1000
                )
        """
        
        query_params = [lng, lat, lng, lat, radius]
        
        # 🔥 FIX 2: Apply the search bar text ('q') to the raw SQL query using ILIKE
        if q:
            base_query += """
                AND (
                    organisation_name ILIKE %s OR 
                    address ILIKE %s OR 
                    city_town_mandal ILIKE %s OR 
                    district ILIKE %s OR
                    state ILIKE %s
                )
            """
            # Add the query 5 times to match the 5 %s placeholders above
            query_params.extend([f"%{q}%", f"%{q}%", f"%{q}%", f"%{q}%", f"%{q}%"])
        
        # Add services_type filter
        if services_types:
            placeholders = ','.join(['%s'] * len(services_types))
            base_query += f" AND services_type IN ({placeholders})"
            query_params.extend(services_types)
        
        # Add costing filter
        if costing:
            base_query += " AND costing_type = %s"
            query_params.append(costing)
        
        # Add gender filter
        if gender:
            base_query += " AND gender = %s"
            query_params.append(gender)
        
        # Add care_type filter
        if care_type:
            base_query += " AND care_type = %s"
            query_params.append(care_type)
        
        base_query += " ORDER BY distance_km LIMIT 50"
        
        with connection.cursor() as cursor:
            cursor.execute(base_query, query_params)
            columns = [col[0] for col in cursor.description]
            results = []
            for row in cursor.fetchall():
                result = dict(zip(columns, row))
                if result.get('distance_km'):
                    result['distance_km'] = round(result['distance_km'], 2)
                results.append(result)
        
        return Response({
            'count': len(results),
            'radius_km': radius,
            'center': {'lat': lat, 'lng': lng},
            'pincode': pincode if pincode else None,
            'filters': {
                'services_type': services_types if services_types else None,
                'costing': costing if costing else None,
                'gender': gender if gender else None,
                'care_type': care_type if care_type else None,
            },
            'results': results
        })

    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        stats = {
            'total_homes': OldAgeHome.objects.count(),
            'homes_with_location': OldAgeHome.objects.filter(
                latitude__isnull=False,
                longitude__isnull=False
            ).count(),
            'by_state': list(
                OldAgeHome.objects.values('state')
                .annotate(count=Count('id'))
                .order_by('-count')[:15]
            ),
            'by_costing': list(
                OldAgeHome.objects.exclude(costing_type='')
                .values('costing_type')
                .annotate(count=Count('id'))
            ),
            'by_care_type': list(
                OldAgeHome.objects.exclude(care_type='')
                .values('care_type')
                .annotate(count=Count('id'))
            ),
        }
        return Response(stats)


class UploadJobViewSet(viewsets.ModelViewSet):
    """
    File upload viewset - AUTHENTICATED ONLY
    """
    queryset = UploadJob.objects.all()
    serializer_class = UploadJobSerializer
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        file = request.FILES.get('file')
        
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not file.name.endswith(('.xlsx', '.xls')):
            return Response({'error': 'Invalid file format. Please upload Excel file'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate unique batch number
        timestamp = timezone.now().strftime('%Y%m%d_%H%M')
        batch_no = f"BATCH_{timestamp}_{uuid.uuid4().hex[:6]}"
        
        # Create job with batch_no
        job = UploadJob.objects.create(
            file=file,
            batch_no=batch_no
        )
        
        try:
            job.status = 'processing'
            job.started_at = timezone.now()
            job.save()
            
            processor = DataProcessor(chunk_size=10)
            results = processor.process_excel_file(job.file.path, job=job)
            
            job.status = 'completed'
            job.completed_at = timezone.now()
            job.save()
            
        except Exception as e:
            job.status = 'failed'
            job.error_log = [{'error': str(e)}]
            job.completed_at = timezone.now()
            job.save()
            
            return Response(
                {
                    'error': 'Processing failed',
                    'message': str(e),
                    'job': self.get_serializer(job).data
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        serializer = self.get_serializer(job)
        return Response(
            {
                'message': 'File processed successfully',
                'job': serializer.data,
                'stats': {
                    'total': results.get('total', 0),
                    'inserted': results.get('inserted', 0),
                    'updated': results.get('updated', 0),
                    'errors': results.get('errors', [])
                }
            },
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        job = self.get_object()
        serializer = self.get_serializer(job)
        response_data = serializer.data
        if job.error_log:
            response_data['recent_errors'] = job.error_log[-5:]
        return Response(response_data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def export_homes_pdf(request):
    """
    Export selected homes to PDF using preexisting letterhead at ./media/layout.pdf.
    """
    try:
        homes_data = request.data.get('homes', [])
        fields = request.data.get('fields', {})
        # --- NEW: Get Ticket ID from request ---
        ticket_id = request.data.get('ticketId', '') 

        if not homes_data:
            return Response(
                {'error': 'No homes provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # --- CHANGED: Pass ticket_id to the build function ---
        content_buffer = _build_content_pdf(homes_data, fields, ticket_id)

        # 2) Load letterhead template
        letterhead_path = os.path.join(settings.MEDIA_ROOT, 'layout.pdf')
        if not os.path.exists(letterhead_path):
            return Response(
                {'error': f'Letterhead template not found at {letterhead_path}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        letterhead_reader = PdfReader(letterhead_path)
        content_reader = PdfReader(content_buffer)

        if len(letterhead_reader.pages) == 0:
            return Response(
                {'error': 'Letterhead PDF has no pages'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        writer = PdfWriter()
        template_page = letterhead_reader.pages[0]

        # 3) For each content page, create a new page and merge template + content onto it
        for content_page in content_reader.pages:
            new_page = writer.add_blank_page(width=A4[0], height=A4[1])
            new_page.merge_page(template_page)
            new_page.merge_page(content_page)

        # 4) Output merged PDF
        out_buffer = BytesIO()
        writer.write(out_buffer)
        out_buffer.seek(0)

        return FileResponse(
            out_buffer,
            as_attachment=True,
            filename=f'satoru-homes-{datetime.datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf',
            content_type='application/pdf'
        )

    except Exception as e:
        logger = logging.getLogger('homes')
        logger.exception("Export homes PDF failed: %s", str(e))
        return Response(
            {'error': f'Export failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )