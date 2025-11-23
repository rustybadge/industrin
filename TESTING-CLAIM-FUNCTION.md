# Testing Guide: Claim Company Function

## Issues Fixed

### 1. Admin Session Persistence ✅
**Problem**: Admin page disappeared every time browser was refreshed, requiring re-login.

**Solution**:
- Extended admin JWT token expiration from 24 hours to 30 days
- Improved token verification with better retry logic (3 attempts with exponential backoff)
- Token is now preserved during network errors and API startup delays
- Only clears token on explicit 401/403 authentication failures

**Test**:
1. Login to admin panel at `/admin/login`
2. Navigate around the admin dashboard
3. Press browser refresh (F5 or Cmd+R)
4. ✅ You should remain logged in

### 2. Company User Management for Testing ✅
**Problem**: Getting "user account already exists" error when testing claim function, but couldn't see or manage existing accounts.

**Solution**:
- Added new "Company Users" section in Admin Settings (`/admin/settings`)
- Shows all company user accounts with their details
- Allows deletion of test accounts to reset and retry claims
- Added backend API endpoints:
  - `GET /api/admin/company-users` - List all company users
  - `DELETE /api/admin/company-users/:id` - Delete a company user

## How to Test the Claim Function

### Step 1: Check for Existing Users
1. Login to admin panel at `/admin/login`
2. Navigate to Settings (gear icon in top navigation)
3. Scroll to "Company Users" section
4. Look for any user accounts associated with "Rusty Support AB"

### Step 2: Delete Test Account (if exists)
1. Find the user account you want to delete
2. Click the "Delete" button
3. Confirm deletion in the dialog
4. ✅ The account is removed and claim can be submitted again

### Step 3: Find Rusty Support AB
1. Go to the companies page at `/companies`
2. Search for "Rusty Support AB"
3. If not found, the company may need to be created first

### Step 4: Submit a Claim
1. Click on "Rusty Support AB" company card
2. Click the "Äger du detta företag?" (Own this company?) button
3. Fill out the claim form with:
   - Name: Your test name
   - Email: A NEW email (not previously used)
   - Phone: Optional
   - Service categories: Select any relevant ones
   - Message: Your relationship to company
   - Accept terms checkbox
4. Click "Skicka ansökan" (Submit application)
5. ✅ Should see success message

### Step 5: Review & Approve Claim
1. Go back to admin dashboard
2. You should see the new claim in "Pending Claims"
3. Click "Review" or navigate to claim requests
4. Click "Approve" on the claim
5. Copy the access token that's generated
6. ✅ Company user account is created

### Step 6: Test Company Login
1. Navigate to `/company/login`
2. Enter the email from the claim
3. Paste the access token
4. Click "Login"
5. ✅ Should be logged in to company dashboard

## Error Messages Explained

### "A company user account already exists for this email"
- **When**: Happens when approving a claim
- **Why**: Someone already submitted and got approved with this email
- **Fix**: 
  1. Go to Admin Settings
  2. Find the user in "Company Users" section
  3. Delete the existing user
  4. OR use a different email address for testing

### "Company not found"
- **When**: Trying to claim a non-existent company
- **Why**: The company doesn't exist in the database
- **Fix**: Create the company first or use an existing one

### "Invalid credentials" (during approval)
- **When**: Approving a claim
- **Why**: Validation error or database issue
- **Fix**: Check server logs for details

## Quick Test Commands

```bash
# Check for Rusty Support AB in database (requires DATABASE_URL env)
npm run check-rusty

# Delete a company user by email
npm run delete-company-user <email>
```

## Notes for Development

- Admin tokens now expire after 30 days (was 24 hours)
- Company tokens expire after 30 days
- Token verification retries 3 times before giving up
- All test data can be managed through Admin Settings UI
- No need to access database directly for testing

## Common Testing Flow

```
1. Admin Settings → Delete any existing test users
2. Companies Page → Find "Rusty Support AB"
3. Company Profile → Click "Äger du detta företag?"
4. Claim Form → Submit with test@example.com
5. Admin Dashboard → See pending claim
6. Approve Claim → Get access token
7. Company Login → Login with test@example.com + token
8. Company Dashboard → View and edit company profile
```

## Troubleshooting

**Admin session still lost on refresh?**
- Clear browser cache and localStorage
- Re-login to get new 30-day token
- Check browser console for errors

**Can't delete company user?**
- Make sure you're logged in as admin
- Check network tab for API errors
- User might have quotes/claims that need to be handled

**Claim submission fails?**
- Check that all required fields are filled
- Verify company exists in database
- Check browser console for validation errors

