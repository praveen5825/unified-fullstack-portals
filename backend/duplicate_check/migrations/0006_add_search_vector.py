from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('duplicate_check', '0005_proposalembedding'),
    ]

    operations = [
        # Add the search_vector column (tsvector type in Postgres)
        migrations.AddField(
            model_name='researchproposal',
            name='search_vector',
            field=SearchVectorField(blank=True, null=True),
        ),
        # GIN index for sub-millisecond boolean FTS queries
        migrations.AddIndex(
            model_name='researchproposal',
            index=GinIndex(fields=['search_vector'], name='proposal_search_vector_idx'),
        ),
    ]
