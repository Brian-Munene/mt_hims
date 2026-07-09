import core.fields
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("patients", "0002_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="patient",
            name="national_id",
            field=core.fields.EncryptedTextField(blank=True),
        ),
        migrations.AlterField(
            model_name="patient",
            name="sha_number",
            field=core.fields.EncryptedTextField(blank=True),
        ),
        migrations.AlterField(
            model_name="patientidentifier",
            name="identifier_value",
            field=core.fields.EncryptedTextField(),
        ),
        migrations.AlterField(
            model_name="allergy",
            name="reaction",
            field=core.fields.EncryptedTextField(blank=True),
        ),
        migrations.AlterField(
            model_name="chroniccondition",
            name="diagnosis",
            field=core.fields.EncryptedTextField(),
        ),
    ]
