<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Admin permissions live in `public.admin_users` (no client insert policy); RLS uses `public.is_admin()` so users can never self-grant. Grant admins via SQL only.
- Product images live in the private `product-images` bucket; the admin stores long-lived signed URLs in `products.images` because public buckets are blocked in this workspace.
- Public catalog merges DB products with legacy localStorage/illustrative items until migration is validated.
