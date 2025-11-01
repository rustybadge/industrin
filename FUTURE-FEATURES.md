# Future Features & Ideas

## Contact Form System (Like Industritorget)

**Status:** Parked for now, but good idea for future

**Current State:**
- Email addresses are shown as direct `mailto:` links when available
- Users can click to open their email client
- Quote request system already exists and stores inquiries in database (`/api/quote-requests`)
- **TODO:** Email notifications are not yet sent (see `server/routes.ts` line 114)

**Proposed Enhancement:**
- Replace direct email display with "Skicka e-post" / "Send Message" button
- Opens contact form modal/page (can use existing quote request form)
- Form submission creates a tracked inquiry/quote request (already works!)
- **Email Flow:** 
  - Primary: Send inquiry email directly to Company X (`company.contactEmail`)
  - Copy/Notification: Also send copy to admin (you) for tracking
  - Both emails sent when form is submitted

**Benefits:**
- ✅ Track inquiry volume and success metrics
- ✅ Reduce spam (emails not publicly visible to scrapers)
- ✅ Structured inquiry data (customer info, message, timestamp)
- ✅ Better user experience (form is easier than email client)
- ✅ Can require fields like company name, project details, etc.

**Implementation Notes:**
- Would integrate with existing quote request system
- Could show both: email link AND form option
- Or replace email link entirely with form
- Need notification system for companies when they receive inquiries

**Reference:**
- Industritorget.se uses this pattern: https://www.industritorget.se/företag/apg+industriservice+ab/166690/
- Users click "Skicka e-post" → opens form
- No public email addresses shown

