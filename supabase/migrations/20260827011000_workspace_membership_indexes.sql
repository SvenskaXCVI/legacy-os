create index if not exists owner_bootstrap_allowlist_claimed_by_idx
  on private.owner_bootstrap_allowlist (claimed_by)
  where claimed_by is not null;

create index if not exists workspace_memberships_user_id_idx
  on public.workspace_memberships (user_id)
  where user_id is not null;

create index if not exists workspace_memberships_created_by_idx
  on public.workspace_memberships (created_by)
  where created_by is not null;

create index if not exists workspace_membership_events_membership_id_idx
  on public.workspace_membership_events (membership_id)
  where membership_id is not null;

create index if not exists workspace_membership_events_actor_user_id_idx
  on public.workspace_membership_events (actor_user_id)
  where actor_user_id is not null;
