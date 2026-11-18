# Security rules

- Direct reads of `public.domain_knowledge` must be restricted to administrators via RLS; AI functions read it server-side with the service role so ordinary users cannot fetch the raw knowledge library.