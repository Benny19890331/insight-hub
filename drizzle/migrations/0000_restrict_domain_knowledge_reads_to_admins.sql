ALTER POLICY "Anyone authenticated can read domain knowledge"
ON public.domain_knowledge
TO authenticated
USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

ALTER POLICY "Anyone authenticated can read domain knowledge"
ON public.domain_knowledge
RENAME TO "Only admins can read domain knowledge";