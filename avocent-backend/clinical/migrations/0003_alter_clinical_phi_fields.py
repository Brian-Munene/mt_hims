import core.fields
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("clinical", "0002_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="clinicalnote",
            name="subjective",
            field=core.fields.EncryptedTextField(blank=True),
        ),
        migrations.AlterField(
            model_name="clinicalnote",
            name="objective",
            field=core.fields.EncryptedTextField(blank=True),
        ),
        migrations.AlterField(
            model_name="clinicalnote",
            name="assessment",
            field=core.fields.EncryptedTextField(blank=True),
        ),
        migrations.AlterField(
            model_name="clinicalnote",
            name="plan",
            field=core.fields.EncryptedTextField(blank=True),
        ),
        migrations.AlterField(
            model_name="diagnosis",
            name="description",
            field=core.fields.EncryptedTextField(blank=True),
        ),
        migrations.AlterField(
            model_name="observation",
            name="value",
            field=core.fields.EncryptedTextField(),
        ),
    ]
