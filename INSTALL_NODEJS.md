# Installing Node.js and npm

You need Node.js to run the server. Here are your options:

---

## Option 1: Install via Conda (Recommended - You're Already Using Conda)

Since you're in a conda environment, install Node.js through conda:

```bash
conda install -c conda-forge nodejs npm
```

**Or if that doesn't work:**
```bash
conda install nodejs
```

**After installation, verify:**
```bash
node --version
npm --version
```

You should see version numbers (e.g., `v20.10.0` and `10.2.3`)

---

## Option 2: Install Node.js Directly (Windows Installer)

1. **Download Node.js:**
   - Go to: https://nodejs.org/
   - Download the **LTS version** (Long Term Support)
   - Choose the **Windows Installer (.msi)** for your system (64-bit)

2. **Run the Installer:**
   - Double-click the downloaded `.msi` file
   - Click "Next" through the installation wizard
   - **IMPORTANT:** Make sure "Add to PATH" is checked (should be by default)
   - Click "Install"
   - Wait for installation to complete

3. **Restart Your Terminal:**
   - Close your current PowerShell/terminal window
   - Open a new terminal window
   - This ensures PATH is updated

4. **Verify Installation:**
   ```bash
   node --version
   npm --version
   ```

---

## Option 3: Install via Chocolatey (If You Have It)

If you have Chocolatey package manager:

```bash
choco install nodejs
```

---

## After Installation

Once Node.js is installed:

1. **Close and reopen your terminal** (to refresh PATH)

2. **Verify it works:**
   ```bash
   node --version
   npm --version
   ```

3. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

4. **Start the server:**
   ```bash
   npm run dev
   ```

---

## Quick Check: Which Method Should You Use?

- **Using Conda/Anaconda?** → Use Option 1 (conda install)
- **Prefer standard installation?** → Use Option 2 (Node.js website)
- **Have Chocolatey?** → Use Option 3

**I recommend Option 1** since you're already in a conda environment!

---

## Troubleshooting

### "node is not recognized" after installation
- **Solution:** Restart your terminal/PowerShell
- Or restart your computer if that doesn't work

### "npm is not recognized" after installing Node.js
- **Solution:** npm comes with Node.js, so if node works but npm doesn't, reinstall Node.js
- Make sure "npm package manager" is checked during installation

### Conda installation fails
- **Solution:** Try updating conda first: `conda update conda`
- Then try: `conda install -c conda-forge nodejs`

---

## What Version Do You Need?

- **Minimum:** Node.js 18.x or higher
- **Recommended:** Node.js 20.x LTS (Long Term Support)
- npm comes automatically with Node.js (no separate installation needed)

