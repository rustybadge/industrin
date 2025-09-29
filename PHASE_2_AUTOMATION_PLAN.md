# Phase 2: Automated Company Profile Completion System

## 🎯 Overview
After companies submit initial claim requests with service categories, implement an automated two-phase approval system that reduces manual work while ensuring quality control.

## 📋 Current Status
- ✅ Phase 1 Complete: Enhanced claim form with service categories
- ✅ Database schema ready for service categories
- ⏳ Phase 2 Pending: Automated approval and profile completion workflow

## 🔄 Proposed Workflow

### Phase 1: Initial Claim (Current)
1. Company fills out basic info + service categories via "Äger du detta företag?" form
2. Admin reviews and approves/rejects in admin dashboard
3. **NEW:** Auto-email sent to company with approval/rejection

### Phase 2: Detailed Profile Setup (To Implement)
1. **Approved companies** receive secure link to complete detailed profile
2. Companies fill out comprehensive information:
   - Full contact details (multiple contacts, roles)
   - Detailed service descriptions
   - Equipment types they work with
   - Certifications and qualifications
   - Company photos/videos
   - Service areas and specializations
3. **Auto-updates** main company record in database

## 🗄️ Database Schema Changes Needed

### Claim Requests Table Updates
```sql
-- Add to existing claim_requests table
ALTER TABLE claim_requests ADD COLUMN approval_token VARCHAR(255);
ALTER TABLE claim_requests ADD COLUMN profile_completed_at TIMESTAMP;
ALTER TABLE claim_requests ADD COLUMN reminder_sent_at TIMESTAMP;
ALTER TABLE claim_requests ADD COLUMN reminder_count INTEGER DEFAULT 0;
```

### New Company Profiles Table
```sql
CREATE TABLE company_profiles (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR(255) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  claim_request_id VARCHAR(255) REFERENCES claim_requests(id),
  
  -- Detailed company information
  detailed_description TEXT,
  company_website TEXT,
  established_year INTEGER,
  employee_count INTEGER,
  
  -- Contact information
  contact_persons JSONB, -- Array of {name, role, email, phone}
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  
  -- Services and equipment
  equipment_types JSONB, -- Array of equipment they work with
  certifications JSONB, -- Array of certifications
  service_areas JSONB, -- Geographic service areas
  specialties TEXT, -- Free text for special expertise
  
  -- Media
  photos JSONB, -- Array of {url, caption, type}
  videos JSONB, -- Array of {url, title, description}
  
  -- Metadata
  completed_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(company_id)
);
```

### New Email Templates Table
```sql
CREATE TABLE email_templates (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type VARCHAR(50) NOT NULL, -- 'approval', 'rejection', 'reminder'
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 📧 Email Automation System

### Required Environment Variables
```bash
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@industrin.net
ADMIN_EMAIL=your_admin_email@domain.com
```

### Email Templates Needed

#### 1. Claim Approval Email
```
Subject: Din ansökan har godkänts - Slutför din profil för [Company Name]

Hej [Name],

Grattis! Din ansökan om kontroll över [Company Name] har godkänts.

Klicka på länken nedan för att slutföra din företagsprofil:
[Secure Profile Completion Link]

Denna länk är giltig i 30 dagar. Om du inte slutför profilen inom denna tid kommer ansökan att tas bort.

Med vänliga hälsningar,
Industrin.net Team
```

#### 2. Claim Rejection Email
```
Subject: Ansökan om [Company Name] - Inte godkänd

Hej [Name],

Tack för din ansökan om kontroll över [Company Name].

Efter granskning har vi beslutat att inte godkänna denna ansökan. Orsaken kan vara:
- Otillräcklig verifiering av företagsägarskap
- Inkomplett information
- Andra säkerhetsfaktorer

Om du har frågor, kontakta oss på support@industrin.net

Med vänliga hälsningar,
Industrin.net Team
```

#### 3. Profile Completion Reminder
```
Subject: Påminnelse: Slutför din profil för [Company Name]

Hej [Name],

Du har ännu inte slutfört din företagsprofil för [Company Name].

Slutför din profil här: [Secure Link]

Denna länk upphör att gälla om 7 dagar.

Med vänliga hälsningar,
Industrin.net Team
```

## 🔧 Technical Implementation

### 1. Resend Integration
```javascript
// netlify/functions/email-service.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendApprovalEmail(claimRequest, company) {
  const profileLink = `${process.env.SITE_URL}/complete-profile/${claimRequest.approval_token}`;
  
  return await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: claimRequest.email,
    subject: `Din ansökan har godkänts - Slutför din profil för ${company.name}`,
    html: generateApprovalEmailHTML(claimRequest, company, profileLink)
  });
}
```

### 2. Secure Profile Completion Page
```typescript
// client/src/pages/complete-profile.tsx
export default function CompleteProfile() {
  // Verify approval token
  // Show comprehensive form for profile completion
  // Update both company and company_profiles tables
}
```

### 3. Admin Dashboard Enhancements
```typescript
// Add to existing admin dashboard
- Bulk approval/rejection actions
- Profile completion tracking
- Email template management
- Reminder scheduling
- Analytics on claim-to-completion rates
```

## 📊 Admin Dashboard New Features

### Claim Management
- **Bulk Actions:** Select multiple claims for batch approval/rejection
- **Quick Actions:** One-click approve/reject with email templates
- **Status Tracking:** Visual indicators for profile completion status
- **Reminder Management:** Send manual reminders for incomplete profiles

### Analytics Dashboard
- **Claim Statistics:** Total claims, approval rate, completion rate
- **Timeline Tracking:** Average time from claim to completion
- **Service Category Analysis:** Most requested services
- **Geographic Distribution:** Claims by region

### Email Management
- **Template Editor:** Edit email templates with preview
- **Email Logs:** Track sent emails and delivery status
- **A/B Testing:** Test different email templates
- **Delivery Analytics:** Open rates, click rates (if using Resend Pro)

## 🚀 Implementation Priority

### Phase 2A: Core Email Automation (Week 1)
1. Set up Resend account and API integration
2. Create basic email templates
3. Add email sending to approval/rejection actions
4. Test email delivery

### Phase 2B: Profile Completion System (Week 2)
1. Create secure profile completion page
2. Build comprehensive profile form
3. Implement database updates
4. Add completion tracking

### Phase 2C: Admin Enhancements (Week 3)
1. Bulk actions in admin dashboard
2. Profile completion tracking
3. Reminder system
4. Basic analytics

### Phase 2D: Advanced Features (Week 4)
1. Email template management
2. Advanced analytics
3. A/B testing capabilities
4. Performance optimization

## 💰 Cost Estimates

### Resend Pricing
- **Free Tier:** 3,000 emails/month (sufficient for initial launch)
- **Pro Plan:** $20/month for 50,000 emails + advanced features

### Development Time
- **Phase 2A:** 8-12 hours
- **Phase 2B:** 16-20 hours
- **Phase 2C:** 12-16 hours
- **Phase 2D:** 16-20 hours
- **Total:** 52-68 hours

## 🎯 Success Metrics

### Key Performance Indicators
- **Claim Approval Rate:** Target 80%+
- **Profile Completion Rate:** Target 70%+
- **Time to Completion:** Target <7 days average
- **Email Delivery Rate:** Target 95%+
- **Admin Time Saved:** Target 80% reduction in manual work

### Business Impact
- **Scalability:** Handle 10x more claims without additional admin work
- **Quality:** More detailed company profiles for better customer matching
- **User Experience:** Professional, automated process
- **Revenue Potential:** Foundation for premium company features

## 📝 Next Steps

When ready to implement:

1. **Set up Resend account** and get API key
2. **Create email templates** based on examples above
3. **Implement database migrations** for new tables
4. **Build profile completion page** with comprehensive form
5. **Add email automation** to admin approval workflow
6. **Test end-to-end process** with sample data
7. **Deploy and monitor** email delivery and completion rates

## 🔗 Related Files

### Files to Create
- `netlify/functions/email-service.js` - Email sending service
- `client/src/pages/complete-profile.tsx` - Profile completion page
- `client/src/components/admin/bulk-actions.tsx` - Bulk admin actions
- `scripts/migrate-phase2-schema.ts` - Database migrations

### Files to Modify
- `netlify/functions/server.js` - Add email sending to approval actions
- `client/src/pages/admin-dashboard.tsx` - Add bulk actions and tracking
- `shared/schema.ts` - Add new table definitions
- `package.json` - Add Resend dependency

---

**Last Updated:** January 2025
**Status:** Ready for Implementation
**Estimated Implementation Time:** 4 weeks
**Priority:** High (enables scaling)
