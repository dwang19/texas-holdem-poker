# GitHub Setup Instructions

⚠️ **Git is not currently installed on your system.** Follow these steps to complete the GitHub integration.

## Step 1: Install Git

Download and install Git for Windows:
1. Go to [https://git-scm.com/download/win](https://git-scm.com/download/win)
2. Download the installer
3. Run the installer with default settings
4. Restart your terminal/command prompt

## Step 2: Install GitHub CLI (Optional but Recommended)

### Option A: Using Winget (Windows Package Manager)
```powershell
winget install --id GitHub.cli
```

### Option B: Manual Download
1. Go to [https://cli.github.com/](https://cli.github.com/)
2. Download the Windows installer
3. Run the installer

## Step 3: Authenticate with GitHub

After installing GitHub CLI:
```bash
gh auth login
```
Follow the prompts to authenticate with your GitHub account.

## Step 4: Create GitHub Repository

### Option A: Using GitHub CLI (Recommended)
```bash
cd "C:\Projects\Texas Holdem Poker"
gh repo create texas-holdem-poker --public --source=. --remote=origin --push
```

### Option B: Manual Creation
1. Go to [https://github.com/new](https://github.com/new)
2. Repository name: `texas-holdem-poker`
3. Description: "Texas Hold'em Poker game built with React & TypeScript"
4. Make it **Public** (for portfolio showcase)
5. **Don't** check "Add a README" (we already have one)
6. Click "Create repository"
7. Copy the repository URL

## Step 5: Connect Local Project to GitHub

After creating the repository on GitHub:

```bash
cd "C:\Projects\Texas Holdem Poker"

# Initialize git repository
git init

# Add all files
git add .

# Initial commit
git commit -m "Initial poker game setup with React + TypeScript

- Basic card dealing and display system
- TypeScript interfaces for game entities
- Card component with professional styling
- Game UI with community and player cards
- Professional README and documentation"

# Connect to GitHub repository
git remote add origin https://github.com/YOUR_USERNAME/texas-holdem-poker.git

# Push to GitHub
git push -u origin main
```

## Step 6: Set Up Deployment (Optional)

### Deploy to Vercel (Recommended for React apps)
1. Go to [https://vercel.com](https://vercel.com)
2. Sign up/Sign in with GitHub
3. Click "Import Project"
4. Connect your `texas-holdem-poker` repository
5. Deploy automatically
6. Get a live URL like: `https://texas-holdem-poker.vercel.app`

### Alternative: Netlify
1. Go to [https://netlify.com](https://netlify.com)
2. Sign up/Sign in with GitHub
3. Connect repository and deploy

## Step 7: Update README with Live Demo Link

After deployment, update your README.md to include the live demo link:

```markdown
## Play Online
[Live Demo](https://your-deployment-url.vercel.app)
```

## Troubleshooting

### Git Commands Not Found
- Make sure Git is installed and added to PATH
- Restart your terminal/command prompt
- Try `where git` to verify installation

### GitHub CLI Issues
- Run `gh auth status` to check authentication
- Try `gh auth login` again if needed

### Push Errors
- Make sure the repository URL is correct
- Check that you have write access to the repository
- Try `git push origin main` instead of `git push -u origin main`

## Need Help?

If you run into issues:
1. Check the error messages carefully
2. Google the specific error
3. The GitHub documentation is excellent for troubleshooting

Once set up, you'll have a professional portfolio project with version control, live deployment, and clean commit history!