-- ============================================================
-- HALAQA — Migration 00024
-- Dedicated Community Comments & Reactions Tables with Sovereign RLS
-- Authorized by DEC-H016
-- ============================================================

-- 1. COMMUNITY COMMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.community_comments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id        UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content          TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_comments_entity_id
  ON public.community_comments (entity_id);

CREATE INDEX IF NOT EXISTS idx_community_comments_org_id
  ON public.community_comments (organization_id);

CREATE INDEX IF NOT EXISTS idx_community_comments_author_id
  ON public.community_comments (author_id);

-- 2. COMMUNITY REACTIONS TABLE (Optional/Extended interactions)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.community_reactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id       UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
  entity_id        UUID REFERENCES public.entities(id) ON DELETE CASCADE,
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type    TEXT NOT NULL DEFAULT 'like',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_community_reaction_user_comment UNIQUE (comment_id, user_id),
  CONSTRAINT uq_community_reaction_user_entity UNIQUE (entity_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_reactions_comment
  ON public.community_reactions (comment_id);

CREATE INDEX IF NOT EXISTS idx_community_reactions_entity
  ON public.community_reactions (entity_id);

-- 3. ROW LEVEL SECURITY (RLS) FOR COMMUNITY COMMENTS
-- ============================================================
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

-- Select: Any organization member (or super_admin) can view comments in their org
CREATE POLICY "community_comments_select_org_members"
  ON public.community_comments FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Insert: Any authenticated member in the same organization can post a comment
CREATE POLICY "community_comments_insert_org_member"
  ON public.community_comments FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Update: Only comment author can edit their own comment
CREATE POLICY "community_comments_update_author"
  ON public.community_comments FOR UPDATE
  USING (
    auth.uid() = author_id
  );

-- Delete: Comment author OR organization staff (owner/manager) OR super_admin can delete
CREATE POLICY "community_comments_delete_author_or_staff"
  ON public.community_comments FOR DELETE
  USING (
    auth.uid() = author_id
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND organization_id = community_comments.organization_id
        AND role IN ('owner', 'manager')
    )
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- 4. ROW LEVEL SECURITY (RLS) FOR COMMUNITY REACTIONS
-- ============================================================
ALTER TABLE public.community_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_reactions_select_org_members"
  ON public.community_reactions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "community_reactions_insert_own"
  ON public.community_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "community_reactions_delete_own"
  ON public.community_reactions FOR DELETE
  USING (
    auth.uid() = user_id
  );

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_comments TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.community_reactions TO authenticated;
GRANT ALL ON public.community_comments TO service_role;
GRANT ALL ON public.community_reactions TO service_role;
