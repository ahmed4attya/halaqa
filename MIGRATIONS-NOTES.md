# MIGRATIONS-NOTES.md — دفتر الترحيلات
القواعد الملزمة:
1. ترحيلات بُرهان 00001–00022 محرمة التعديل — تمدد حَلَقة فقط من 00023 فصاعداً (DEC-H009).
2. كل ترحيل جديد يأخذ ملاحظة إلزامية هنا: (الرقم، التاريخ، لماذا أُضيف، ماذا يخدم، سياسات RLS المرفقة).
3. لا ترحيل بلا سياسات RLS لجداوله الجديدة في نفس الملف (H4 من الدرع).

| الترحيل | الغرض (من قراءة المحتوى الفعلي) | ملاحظات RLS |
|---|---|---|
| 00001_initial_schema.sql | الهيكل التأسيسي لنظام متعدد المستأجرين (جداول: organizations, branches, profiles, entities) وتوجيه المسارات عبر slug | تمكين RLS على الجداول الأساسية وسياسات القراءة والاختيار للمؤسسات |
| 00002_fix_branches_rls.sql | تصحيح سياسة الوصول لجدول branches للسماح بالقراءة العامة للفروع النشطة | سياسة branches_select_public للفروع النشطة والمؤسسات النشطة |
| 00003_fix_profiles_rls_recursion.sql | حل مشكلة الاستدعاء الذاتي اللانهائي (Infinite Recursion) في سياسات profiles | سياسات profiles_select_org_members و profiles_update_org_staff |
| 00004_add_branch_slug_is_active.sql | إضافة حقلي slug و is_active لجدول branches لدعم روابط الفروع | لا جداول جديدة ولا سياسات RLS مضافة |
| 00005_storage_bucket_policies.sql | إنشاء مستودع التخزين organization_assets وسياسات التحكم بالملفات | سياسات تخزين org_assets_select و org_assets_insert مع فحص العضوية |
| 00006_series_and_playlists.sql | بنية السلاسل وقوائم التشغيل (series & playlists) للمسارات التعليمية | تمكين RLS وسياسات series_select_org و series_select_public |
| 00007_add_content_type_audio.sql | توسيع أنواع المحتوى بدعم الملفات الصوتية (audio_url, audio_file) | قيود فحص على الجدول القائم — لا RLS جديد |
| 00008_fix_security_lints.sql | معالجة تحذيرات فاحص أمان Supabase (search_path في الدوال والـ views) | ضبط search_path للدوال الأمنية لمنع هجمات المسار |
| 00009_observatory_module.sql | بنية المرصد الفكري الرقمي (observatory_analysts, observatory_threats) | تمكين RLS وسياسات وصول للمحللين والمشرفين |
| 00010_ai_jobs_hardened.sql | المحرك الخلفي لمهام الذكاء الاصطناعي ومحاسبة الحصص (ai_jobs, ai_usage) | تمكين RLS وسياسات عزل مهام الذكاء الاصطناعي لكل مستأجر |
| 00011_fix_public_read_rls.sql | استعادة مسارات القراءة العامة للمحتوى والتهديدات بعد ارتداد الترحيل 00008 | تحديث سياسات entities_select_org_member و public read |
| 00012_storage_tenant_isolation.sql | عزل صارم لمستودع تخزين ملفات المؤسسات لمنع الوصول المتقاطع | سياسات تخزين مشددة org_assets_insert و org_assets_update بناءً على org_id |
| 00013_align_storage_bucket_contract.sql | مطابقة إعدادات مستودع التخزين مع مواصفات التطبيق (أحجام الملفات والأنواع) | ضبط إعدادات الـ bucket القائم |
| 00014_restore_entities_content_type_check.sql | استعادة قيد الفحص CHECK على أنواع المحتوى لضمان سلامة البيانات | إعادة فرض قيد CHECK content_type |
| 00015_subscription_foundation.sql | البنية التأسيسية للاشتراكات والخطط التجارية (plans, subscriptions) | تمكين RLS وسياسات قراءة الخطط وعزل اشتراكات المؤسسات |
| 00016_enforce_branch_limit.sql | فرض حدود الحصص للحد الأقصى من الفروع ذرياً لكل منظمة | دالة فحص ترقية الخطط والحدود الذرية |
| 00017_enforce_membership_security.sql | حماية أمن العضويات ومنع التعيين الذاتي للصلاحيات العليا والتحقق من الاشتراكات | تحديث سياسات profiles_update_own و profiles_update_org_staff |
| 00018_tenant_ai_credentials.sql | جدول بيانات اعتماد الذكاء الاصطناعي الخاصة بالمستأجر (BYOK) | تمكين RLS وسياسات عزل مفاتيح المستأجر حصرياً |
| 00019_tenant_provisioning_engine.sql | محرك التهيئة الذري للمستأجر الجديد عبر إجراء مخزن ومعاملات (RPC) | دالة آمنة SECURITY DEFINER بضوابط تحقق مشددة |
| 00020_security_hardening_observatory.sql | تعزيز أمني وعزل للمرصد الفكري ومشغلاته | تحديث سياسات المحللين analysts_select و analysts_insert |
| 00021_fix_public_series_read.sql | استعادة سياسة القراءة العامة للسلاسل للمستخدمين المصادقين | تحديث سياسة series_select_public |
| 00022_enforce_observatory_url_schemes.sql | فرض قيود صارمة على مخططات عناوين URL (http/https فقط) في قاعدة البيانات | قيود فحص CHECK لمنع روابط javascript/data الخبيثة |
| 00023_fix_series_rls.sql | تفعيل RLS على جدول series (إغلاق ثغرة F-RLS-01) وتوثيق تبعية امتدادات extensions (DEC-H013) | تمكين RLS على public.series (12/12 جدول مفعل) |

## ملحق بيئة التشغيل (H2) — تدخلات خارج ملفات الترحيلات (موثقة هنا حصراً — لا تعديل على الموروث وفق H7)
1. `ALTER DATABASE postgres SET search_path TO public, extensions;` — نُفِّذ قبل إتمام الدفع الأول؛ السبب: الاستضافة السحابية لـSupabase تثبّت امتدادات uuid-ossp/pgcrypto في مخطط `extensions` بينما الترحيلات الوراثية تستدعي دوالها غير مؤهلة. **إلزامي على أي مشروع Supabase جديد قبل أول `db push`.**
2. دالة `public.rls_auto_enable()` (جسم فارغ BEGIN END) أُنشئت يدوياً لتجاوز `REVOKE` في 00008 على دالة غير معرفة في 00001–00007. نتيجة الفحص الحاسم (pg_proc + grep): في pg_proc الدالة معرّفة بـ (args: "", returns: void)؛ وفي شجرة الترحيلات لا يوجد أي تعريف لها إطلاقاً وتظهر فقط في الترحيل 00008 بالسطرين 11 و 45 (REVOKE EXECUTE). إذن الدالة تكميلية ولا تستبدل أي منطق أمني موروث.
3. كلا التدخلين حالة بيئة حية موثقة هنا؛ لا أثر لهما في ملفات الترحيلات الوراثية.
