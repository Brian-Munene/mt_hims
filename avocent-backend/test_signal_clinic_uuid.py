import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "avocent_backend.settings")
django.setup()

from users.models import PractitionerProfile, User, Clinic
from users.serializers import PractitionerProfileSerializer

clinic = Clinic.objects.first()

data = {
    "clinic": str(clinic.id),
    "license_number": "DOC-7777",
    "specialty": "Cardiology",
    "user_data": {
        "email": "testdoc7777@example.com",
        "password": "securepassword",
        "is_staff": True,
        "clinic": str(clinic.id) # Providing as string UUID like the frontend does
    }
}

serializer = PractitionerProfileSerializer(data=data)
if serializer.is_valid():
    try:
        profile = serializer.save()
        print("Success!", profile.user.email, profile.user.clinic_id)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print("Error during save:", type(e), e)
else:
    print("Validation errors:", serializer.errors)
