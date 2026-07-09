from django.test import TestCase

from core.tests.utils import ClinicAPIFixtureMixin
from users.serializers import UserSerializer


class UserSerializerTests(ClinicAPIFixtureMixin, TestCase):
    def test_create_hashes_password(self):
        serializer = UserSerializer(
            data={
                "clinic": self.clinic.id,
                "email": "serializer-user@example.com",
                "phone": "+254700123123",
                "password": "secret123",
                "is_staff": False,
                "is_active": True,
                "is_superuser": False,
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()

        self.assertNotEqual(user.password, "secret123")
        self.assertTrue(user.check_password("secret123"))

    def test_update_hashes_new_password(self):
        serializer = UserSerializer(
            instance=self.doctor,
            data={"password": "updated-secret123"},
            partial=True,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()

        self.assertTrue(user.check_password("updated-secret123"))
