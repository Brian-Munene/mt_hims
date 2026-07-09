from datetime import timedelta

from django.utils import timezone

from core.tasking import shared_task

OVERDUE_HOURS = 24
RESOURCE_TYPE = "encounters.encounter"
CLOSED_INVOICE_STATUSES = ("paid", "void")


@shared_task(name="compliance.flag_overdue_outpatient_encounters")
def flag_overdue_outpatient_encounters():
    from billing.models import Invoice
    from compliance.models import ComplianceRecord
    from encounters.models import Encounter

    cutoff = timezone.now() - timedelta(hours=OVERDUE_HOURS)
    closed_encounter_ids = Invoice.objects.filter(status__in=CLOSED_INVOICE_STATUSES).values("encounter_id")
    overdue_encounters = Encounter.objects.filter(status="active", start_time__lte=cutoff).exclude(
        pk__in=closed_encounter_ids
    )

    already_flagged_ids = set(
        ComplianceRecord.objects.filter(
            resource_type=RESOURCE_TYPE,
            resource_id__in=overdue_encounters.values("id"),
            status="open",
        ).values_list("resource_id", flat=True)
    )

    created = 0
    for encounter in overdue_encounters:
        if encounter.id in already_flagged_ids:
            continue
        ComplianceRecord.objects.create(
            clinic=encounter.clinic,
            resource_type=RESOURCE_TYPE,
            resource_id=encounter.id,
            flag_reason=(
                f"Encounter has been open for over {OVERDUE_HOURS} hours with no closed "
                "(paid or void) invoice."
            ),
        )
        created += 1
    return created
