import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('business', '0009_remove_transaction_client_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='transactionoperation',
            name='client',
        ),
        migrations.AddField(
            model_name='transaction',
            name='client',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='transactions',
                to='business.client',
            ),
        ),
    ]

