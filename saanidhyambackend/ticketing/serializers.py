from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Ticket, TicketNote
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class NoteSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = TicketNote
        fields = ['id', 'ticket', 'user', 'user_name', 'content', 'created_at']
        read_only_fields = ['user']

    def get_user_name(self, obj):
        full_name = obj.user.get_full_name()
        return full_name if full_name else obj.user.username


class TicketSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = '__all__'
        read_only_fields = ['created_by', 'updated_at', 'created_at']

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return "System"
        return obj.created_by.get_full_name() or obj.created_by.username

    def get_assigned_to_name(self, obj):
        if not obj.assigned_to:
            return "Unassigned"
        return obj.assigned_to.get_full_name() or obj.assigned_to.username


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username = attrs.get("username")
        password = attrs.get("password")

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise serializers.ValidationError({"error_code": "USER_NOT_FOUND"})

        if not user.check_password(password):
            raise serializers.ValidationError({"error_code": "INVALID_PASSWORD"})

        data = super().validate(attrs)
        data["user"] = {
            "id": user.id,
            "name": user.get_full_name() or user.username,
            "role": "admin" if user.is_staff else "agent",
            "email": user.email
        }
        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['name'] = user.get_full_name() or user.username
        token['role'] = "admin" if user.is_staff else "agent"
        return token