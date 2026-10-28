"""initial schema

Revision ID: e7214689feb3
Revises: 
Create Date: 2026-10-28 05:35:42.327660

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e7214689feb3'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('department', sa.String(length=100), nullable=False, server_default="CSE / Interdisciplinary DT"),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # Project analysis runs
    op.create_table(
        'project_analysis_runs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('mode', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('raw_input', sa.Text(), nullable=False),
        sa.Column('selected_plan_id', sa.String(length=32), nullable=False, server_default="plan_b"),
        sa.Column('system_graph_json', sa.JSON(), nullable=False),
        sa.Column('candidate_plans_json', sa.JSON(), nullable=False),
        sa.Column('upskilled_blueprint_json', sa.JSON(), nullable=True),
        sa.Column('analysis_json', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_project_analysis_runs_user_id'), 'project_analysis_runs', ['user_id'], unique=False)

    # Simulation executions
    op.create_table(
        'simulation_executions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('run_id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('plan_id', sa.String(length=32), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False, server_default="queued"),
        sa.Column('result_json', sa.JSON(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['run_id'], ['project_analysis_runs.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_simulation_executions_run_id'), 'simulation_executions', ['run_id'], unique=False)
    op.create_index(op.f('ix_simulation_executions_user_id'), 'simulation_executions', ['user_id'], unique=False)

    # Sandbox execution logs
    op.create_table(
        'sandbox_execution_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('execution_id', sa.String(length=36), nullable=False),
        sa.Column('run_id', sa.String(length=36), nullable=False),
        sa.Column('plan_id', sa.String(length=32), nullable=False),
        sa.Column('step_number', sa.Integer(), nullable=False),
        sa.Column('step_name', sa.String(length=64), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('log_output', sa.Text(), nullable=False),
        sa.Column('duration_ms', sa.Integer(), nullable=False, server_default="0"),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['execution_id'], ['simulation_executions.id'], ),
        sa.ForeignKeyConstraint(['run_id'], ['project_analysis_runs.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_sandbox_execution_logs_id'), 'sandbox_execution_logs', ['id'], unique=False)
    op.create_index(op.f('ix_sandbox_execution_logs_execution_id'), 'sandbox_execution_logs', ['execution_id'], unique=False)
    op.create_index(op.f('ix_sandbox_execution_logs_run_id'), 'sandbox_execution_logs', ['run_id'], unique=False)

    # Rate limit records
    op.create_table(
        'rate_limit_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(length=128), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_rate_limit_records_id'), 'rate_limit_records', ['id'], unique=False)
    op.create_index(op.f('ix_rate_limit_records_key'), 'rate_limit_records', ['key'], unique=False)
    op.create_index(op.f('ix_rate_limit_records_created_at'), 'rate_limit_records', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_table('rate_limit_records')
    op.drop_table('sandbox_execution_logs')
    op.drop_table('simulation_executions')
    op.drop_table('project_analysis_runs')
    op.drop_table('users')
