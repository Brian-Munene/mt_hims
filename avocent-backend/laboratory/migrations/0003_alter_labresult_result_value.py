import core.fields
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("laboratory", "0002_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="labresult",
            name="result_value",
            field=core.fields.EncryptedTextField(),
        ),
    ]
