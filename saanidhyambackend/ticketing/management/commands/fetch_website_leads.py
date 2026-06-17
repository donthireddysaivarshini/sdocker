import os
import psycopg2
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from ticketing.models import Ticket, TicketNote 

class Command(BaseCommand):
    help = 'Fetches new leads from the Main Website Database and creates Tickets'

    def handle(self, *args, **kwargs):
        self.stdout.write("Connecting to Main Website Database...")
        WEBSITE_DB_URL = os.environ.get('WEBSITE_DB_URL')

        if not WEBSITE_DB_URL:
            self.stdout.write(self.style.ERROR('CRITICAL ERROR: WEBSITE_DB_URL is missing.'))
            return

        try:
            conn = psycopg2.connect(WEBSITE_DB_URL)
            cursor = conn.cursor()

            # 1. Selection Tally (32 fields)
            cursor.execute("""
                SELECT 
                    id, beneficiary, user_name, user_age, user_phone, user_email,
                    user_country, user_country_other, user_pincode, user_state, user_district, user_city, user_area,
                    father_age, mother_age, relation_type, relative_name, relative_age,
                    client_country, client_country_other, client_pincode, client_state, client_district, client_city, client_area,
                    health_condition, health_condition_details, service_types,
                    budget_min, budget_max, preferred_locations, notes
                FROM saanidhyam_leads 
                WHERE is_processed = FALSE;
            """)
            new_leads = cursor.fetchall()

            if not new_leads:
                self.stdout.write(self.style.SUCCESS("No new leads found."))
                return

            # --- MISSING VARIABLES DEFINED HERE ---
            admin_user = User.objects.filter(is_superuser=True).first() or User.objects.first()
            processed_ids = []

            for lead in new_leads:
                # 2. Unpack Tally (Matches the 32 fields in SELECT)
                (l_id, l_ben, l_u_name, l_u_age, l_u_phone, l_u_email,
                 l_u_country, l_u_c_other, l_u_pin, l_u_state, l_u_dist, l_u_city, l_u_area,
                 l_f_age, l_m_age, l_rel_type, l_rel_name, l_rel_age,
                 l_c_country, l_c_c_other, l_c_pin, l_c_state, l_c_dist, l_c_city, l_c_area,
                 l_cond, l_cond_det, l_services,
                 l_b_min, l_b_max, l_locations, l_notes) = lead

                # 3. Create Ticket with Correct Mapping
                ticket = Ticket.objects.create(
                    beneficiary=l_ben,
                    user_name=l_u_name,
                    age=l_u_age,
                    phone=l_u_phone,
                    email=l_u_email,
                    user_country=l_u_country,
                    user_country_other=l_u_c_other or "",
                    user_state=l_u_state,
                    user_district=l_u_dist,
                    user_city=l_u_city,
                    user_area=l_u_area,
                    user_pincode=l_u_pin,
                    father_age=l_f_age,
                    mother_age=l_m_age,
                    relation_type=l_rel_type,
                    relative_name=l_rel_name,
                    relative_age=l_rel_age,
                    client_country=l_c_country,
                    client_country_other=l_c_c_other or "",
                    client_pincode=l_c_pin,
                    client_state=l_c_state,
                    client_district=l_c_dist,
                    client_city=l_c_city,
                    client_area=l_c_area,
                    client_condition=l_cond,
                    client_condition_details=l_cond_det,
                    service_types=l_services,
                    budget_min=l_b_min,
                    budget_max=l_b_max,
                    preferred_locations=l_locations,
                    notes=l_notes,
                    created_by=admin_user
                )

                TicketNote.objects.create(
                    ticket=ticket,
                    user=admin_user,
                    content=f"Ticket automatically generated. Beneficiary: {l_ben}"
                )

                processed_ids.append(l_id)
                self.stdout.write(f"Created Ticket #{ticket.id} for {l_u_name}")

            # MARK PROCESSED ON WEBSITE
            if processed_ids:
                format_strings = ','.join(['%s'] * len(processed_ids))
                cursor.execute(f"UPDATE saanidhyam_leads SET is_processed = TRUE WHERE id IN ({format_strings})", tuple(processed_ids))
                conn.commit()

            cursor.close()
            conn.close()
            self.stdout.write(self.style.SUCCESS(f'Imported {len(processed_ids)} tickets.'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {str(e)}'))