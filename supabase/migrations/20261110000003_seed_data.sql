-- 00003_seed_data.sql
-- Clearly labelled demonstration records for Roshan Rozgar

do $$
declare
  v_rashid_user_id uuid := '00000000-0000-0000-0000-000000000001';
  v_tariq_user_id  uuid := '00000000-0000-0000-0000-000000000002';
  v_nadeem_user_id uuid := '00000000-0000-0000-0000-000000000003';
  v_cust1_user_id  uuid := '00000000-0000-0000-0000-000000000011';
  v_cust2_user_id  uuid := '00000000-0000-0000-0000-000000000012';

  v_rashid_worker_id uuid := '11111111-1111-1111-1111-111111111111';
  v_tariq_worker_id  uuid := '22222222-2222-2222-2222-222222222222';
  v_nadeem_worker_id uuid := '33333333-3333-3333-3333-333333333333';
begin
  -- Insert demo auth users if auth schema exists and users don't exist
  if exists (select 1 from information_schema.tables where table_schema = 'auth' and table_name = 'users') then
    insert into auth.users (id, email, raw_user_meta_data, created_at, email_confirmed_at)
    values
      (v_rashid_user_id, 'demo.rashid@roshanrozgar.pk', '{"display_name": "Mohammad Rashid"}'::jsonb, now(), now()),
      (v_tariq_user_id, 'demo.tariq@roshanrozgar.pk', '{"display_name": "Tariq Mehmood"}'::jsonb, now(), now()),
      (v_nadeem_user_id, 'demo.nadeem@roshanrozgar.pk', '{"display_name": "Nadeem Akhtar"}'::jsonb, now(), now()),
      (v_cust1_user_id, 'demo.customer1@roshanrozgar.pk', '{"display_name": "Usman Khan"}'::jsonb, now(), now()),
      (v_cust2_user_id, 'demo.customer2@roshanrozgar.pk', '{"display_name": "Fatima Bibi"}'::jsonb, now(), now())
    on conflict (id) do nothing;
  end if;

  -- Profiles
  insert into public.profiles (id, display_name, locale)
  values
    (v_rashid_user_id, 'Mohammad Rashid', 'ur'),
    (v_tariq_user_id, 'Tariq Mehmood', 'ur'),
    (v_nadeem_user_id, 'Nadeem Akhtar', 'ur'),
    (v_cust1_user_id, 'Usman Khan', 'en'),
    (v_cust2_user_id, 'Fatima Bibi', 'ur')
  on conflict (id) do update set display_name = excluded.display_name;

  -- Worker profiles
  insert into public.worker_profiles (
    id,
    owner_user_id,
    name,
    bio,
    years_experience,
    locality_id,
    avatar_url,
    availability_opt_in,
    availability_expires_at,
    is_demo,
    created_at,
    updated_at
  )
  values
    (
      v_rashid_worker_id,
      v_rashid_user_id,
      'Mohammad Rashid',
      'ماہر الیکٹریشن - وائرنگ، شارٹ سرکٹ فالٹ ٹریسنگ اور یو پی ایس کا کام۔ تسلی بخش کام اور مناسب ریٹ۔',
      8,
      'g-10-islamabad',
      '/images/profile-1.jpg',
      true,
      now() + interval '8 hours',
      true,
      now(),
      now()
    ),
    (
      v_tariq_worker_id,
      v_tariq_user_id,
      'Tariq Mehmood',
      'سینیٹری اور پلمبنگ کے تمام کام، گیزر انسٹالیشن اور پائپ لیکیج کا فوری حل۔ 12 سال کا تجربہ۔',
      12,
      'f-10-islamabad',
      '/images/profile-2.jpg',
      true,
      now() + interval '8 hours',
      true,
      now(),
      now()
    ),
    (
      v_nadeem_worker_id,
      v_nadeem_user_id,
      'Nadeem Akhtar',
      'الیکٹریکل اور پلمبنگ دونوں کاموں کے ماہر۔ موٹر وائنڈنگ، واٹر پمپ ریپئر اور گھر کی مینٹیننس۔',
      5,
      'i-9-islamabad',
      '/images/profile-3.jpg',
      true,
      now() + interval '8 hours',
      true,
      now(),
      now()
    )
  on conflict (id) do update set
    availability_opt_in = excluded.availability_opt_in,
    availability_expires_at = excluded.availability_expires_at;

  -- Worker trades
  insert into public.worker_trades (worker_id, trade_id)
  values
    (v_rashid_worker_id, 'electrician'),
    (v_tariq_worker_id, 'plumber'),
    (v_nadeem_worker_id, 'plumber'),
    (v_nadeem_worker_id, 'electrician')
  on conflict (worker_id, trade_id) do nothing;

  -- Worker service areas
  insert into public.worker_service_areas (worker_id, locality_id)
  values
    (v_rashid_worker_id, 'g-10-islamabad'),
    (v_rashid_worker_id, 'f-10-islamabad'),
    (v_tariq_worker_id, 'f-10-islamabad'),
    (v_tariq_worker_id, 'g-10-islamabad'),
    (v_nadeem_worker_id, 'i-9-islamabad'),
    (v_nadeem_worker_id, 'g-10-islamabad')
  on conflict (worker_id, locality_id) do nothing;

  -- Historical demo jobs must exist before their FK-linked reviews.
  insert into public.jobs(id,customer_id,worker_id,trade_id,locality_id,task,pricing_path,state,is_demo)
  values
   ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',v_cust1_user_id,v_rashid_worker_id,'electrician','g-10-islamabad','Demo: short circuit repair','fixed','completed',true),
   ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',v_cust2_user_id,v_rashid_worker_id,'electrician','g-10-islamabad','Demo: breaker replacement','fixed','completed',true),
   ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',v_cust1_user_id,v_tariq_worker_id,'plumber','g-9-islamabad','Demo: kitchen pipe repair','fixed','completed',true)
  on conflict(id) do nothing;

  -- Reviews for Rashid
  insert into public.reviews (
    id,
    job_id,
    worker_id,
    author_id,
    rating,
    punctuality,
    price_honoured,
    text,
    is_demo,
    created_at
  )
  values
    (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
      v_rashid_worker_id,
      v_cust1_user_id,
      5,
      true,
      true,
      'رشید بھائی نے وقت پر آ کر شارٹ سرکٹ ٹھیک کیا۔ جو ریٹ طے ہوا تھا وہی لیا۔ بہت شریف آدمی ہیں۔',
      true,
      now() - interval '2 days'
    ),
    (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
      v_rashid_worker_id,
      v_cust2_user_id,
      5,
      true,
      true,
      'Great work on DB breaker replacement. Highly recommended in G-10.',
      true,
      now() - interval '5 days'
    )
  on conflict (id) do nothing;

  -- Reviews for Tariq
  insert into public.reviews (
    id,
    job_id,
    worker_id,
    author_id,
    rating,
    punctuality,
    price_honoured,
    text,
    is_demo,
    created_at
  )
  values
    (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
      v_tariq_worker_id,
      v_cust1_user_id,
      5,
      true,
      true,
      'طارق صاحب نے کچن کا پائپ لیکیج بہت اچھے طریقے سے فکس کیا۔ صفائی کا خیال بھی رکھا۔',
      true,
      now() - interval '1 day'
    )
  on conflict (id) do nothing;
end;
$$;
