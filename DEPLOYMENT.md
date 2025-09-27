# 🚀 Deployment Guide - Industrin.se

## ✅ **Current Status**

- **✅ GitHub Repository**: [https://github.com/rustybadge/industrin.git](https://github.com/rustybadge/industrin.git)
- **✅ Database**: 363 companies migrated to Neon PostgreSQL
- **✅ Code**: Cleaned and ready for production
- **✅ Configuration**: Netlify deployment files created

## 🌐 **Netlify Deployment Steps**

### **1. Connect to Netlify**

1. Go to [netlify.com](https://netlify.com) and sign in
2. Click **"New site from Git"**
3. Choose **"GitHub"** as your Git provider
4. Authorize Netlify to access your GitHub account
5. Select repository: **`rustybadge/industrin`**

### **2. Configure Build Settings**

Netlify should auto-detect these settings, but verify:

- **Build command**: `npm run build`
- **Publish directory**: `dist/public`
- **Node version**: `18` (or latest LTS)

### **3. Environment Variables**

Add this environment variable in Netlify:

- **Key**: `DATABASE_URL`
- **Value**: `postgresql://neondb_owner:npg_t4TkqpA3cQxv@ep-solitary-art-a9sxi4nu-pooler.gwc.azure.neon.tech/industrin?sslmode=require&channel_binding=require`

### **4. Deploy**

1. Click **"Deploy site"**
2. Wait for the build to complete (usually 2-3 minutes)
3. Your site will be live at: `https://your-site-name.netlify.app`

## 🔧 **Local Development**

```bash
# Clone the repository
git clone https://github.com/rustybadge/industrin.git
cd industrin

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL

# Start development server
npm run dev
```

## 📊 **Database Management**

### **Schema Updates**
```bash
npm run db:push
```

### **View Database**
- Go to your Neon dashboard
- Use the SQL Editor to query your data
- Example: `SELECT COUNT(*) FROM companies;`

## 🛠️ **Troubleshooting**

### **Build Failures**
- Check Node.js version (should be 18+)
- Verify all dependencies are installed
- Check environment variables are set

### **Database Connection Issues**
- Verify DATABASE_URL is correct
- Check Neon database is active
- Ensure SSL is enabled

### **Development Server Issues**
- Make sure port 5000 is available
- Check DATABASE_URL environment variable
- Restart the server if needed

## 📈 **Post-Deployment**

### **SEO Optimization**
- Submit your sitemap to Google Search Console
- Verify meta tags are working
- Check mobile responsiveness

### **Analytics**
- Add Google Analytics if desired
- Monitor site performance
- Track user engagement

### **Maintenance**
- Regular database backups
- Monitor Neon database usage
- Update dependencies regularly

## 🔗 **Useful Links**

- **GitHub Repository**: [https://github.com/rustybadge/industrin](https://github.com/rustybadge/industrin)
- **Neon Dashboard**: [https://console.neon.tech](https://console.neon.tech)
- **Netlify Dashboard**: [https://app.netlify.com](https://app.netlify.com)

## 📞 **Support**

If you encounter any issues during deployment:
1. Check the build logs in Netlify
2. Verify environment variables
3. Test locally first
4. Check database connectivity

---

**🎉 Your Swedish industrial company directory is ready to go live!**
