CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = _user_id)
$$;
DROP POLICY "Public reads active categories" ON public.categories;
CREATE POLICY "Anon reads active categories" ON public.categories FOR SELECT TO anon USING (active);
CREATE POLICY "Users read active or admin all categories" ON public.categories FOR SELECT TO authenticated USING (active OR public.is_admin(auth.uid()));
DROP POLICY "Public reads active products" ON public.products;
CREATE POLICY "Anon reads active products" ON public.products FOR SELECT TO anon USING (active);
CREATE POLICY "Users read active or admin all products" ON public.products FOR SELECT TO authenticated USING (active OR public.is_admin(auth.uid()));