from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('duplicate_check', '0002_documentsimilarityresult_check_id_and_more'),
    ]

    operations = [
        # Remove the unique constraint on spark_id + scheme to allow duplicates
        migrations.RemoveConstraint(
            model_name='researchproposal',
            name='unique_spark_id_per_scheme',
        ),

        # Make existing fields optional (blank=True / null=True where needed)
        migrations.AlterField(
            model_name='researchproposal',
            name='scheme',
            field=models.CharField(blank=True, db_index=True, default='', max_length=10, choices=[('SPARK', 'SPARK'), ('PG-STAR', 'PG-STAR'), ('PDF-STAR', 'PDF-STAR')]),
        ),
        migrations.AlterField(
            model_name='researchproposal',
            name='state',
            field=models.CharField(blank=True, db_index=True, default='', max_length=100),
        ),
        migrations.AlterField(
            model_name='researchproposal',
            name='college_name',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AlterField(
            model_name='researchproposal',
            name='guide_name',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AlterField(
            model_name='researchproposal',
            name='student_name',
            field=models.CharField(blank=True, db_index=True, default='', max_length=255),
        ),
        migrations.AlterField(
            model_name='researchproposal',
            name='year',
            field=models.CharField(blank=True, db_index=True, default='', max_length=20),
        ),
        migrations.AlterField(
            model_name='researchproposal',
            name='title',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AlterField(
            model_name='researchproposal',
            name='research_area',
            field=models.CharField(blank=True, db_index=True, default='', max_length=255),
        ),
        migrations.AlterField(
            model_name='researchproposal',
            name='status',
            field=models.CharField(blank=True, db_index=True, default='received', max_length=20, choices=[('received', 'Received'), ('selected', 'Selected'), ('awarded', 'Awarded')]),
        ),
        migrations.AlterField(
            model_name='researchproposal',
            name='document',
            field=models.FileField(blank=True, null=True, upload_to='proposals/%Y/%m/'),
        ),

        # Add new session field
        migrations.AddField(
            model_name='researchproposal',
            name='session',
            field=models.CharField(blank=True, db_index=True, default='', max_length=20),
        ),

        # Add new final_report field
        migrations.AddField(
            model_name='researchproposal',
            name='final_report',
            field=models.FileField(blank=True, null=True, upload_to='final_reports/%Y/%m/'),
        ),

        # Add index on session
        migrations.AddIndex(
            model_name='researchproposal',
            index=models.Index(fields=['session'], name='duplicate_c_session_idx'),
        ),
    ]
