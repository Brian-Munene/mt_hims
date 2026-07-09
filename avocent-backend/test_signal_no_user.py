import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "avocent_backend.settings")
django.setup()

from users.models import PractitionerProfile, User, Clinic
from users.serializers import PractitionerProfileSerializer

clinic = Clinic.objects.first()

data = {
    "clinic": str(clinic.id),
    "license_number": "DOC-8888",
    "specialty": "Cardiology",
}

serializer = PractitionerProfileSerializer(data=data)
if serializer.is_valid():
    try:
        profile = serializer.save()
        print("Success!")
    except Exception as e:
        print("Error during save:", type(e), e)
else:
    print("Validation errors:", serializer.errors)
