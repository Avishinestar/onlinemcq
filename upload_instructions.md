# How to Upload Your Project to GitHub Manually

Follow these steps to upload your "Online MCQ Application" to GitHub.

## Prerequisites
1.  **Git Installed**: Ensure you have Git installed on your computer.
2.  **GitHub Account**: You need a logged-in GitHub account.

## Step 1: Open Terminal in Project Folder
You are already in the correct folder: `c:\Users\ITIUDGIR\Desktop\ES`.
If you closed the terminal, open it and navigate to this folder.

## Step 2: Initialize Git Repository
Run the following command to turn your folder into a Git repository:
```bash
git init
```

## Step 3: Add Files to Staging
This prepares all your project files (HTML, CSS, JS, etc.) for the first save.
```bash
git add .
```
*Note: This respects the `.gitignore` file we created, so it automatically skips temporary files.*

## Step 4: Commit Your Changes
Save the files to the local history with a message.
```bash
git commit -m "Initial commit: Online MCQ App with Split Chapters and Review Feature"
```

## Step 5: Create a New Repository on GitHub
1.  Go to [github.com/new](https://github.com/new).
2.  **Repository name**: Enter a name (e.g., `online-mcq-app`).
3.  **Description**: (Optional) "Employability Skills MCQ Test App".
4.  **Public/Private**: Choose your preference.
5.  **Do NOT check** "Initialize this repository with a README" (since we are importing an existing repository).
6.  Click **Create repository**.

## Step 6: Connect to GitHub
Once created, GitHub will show you a page with commands. Look for the section **"…or push an existing repository from the command line"**.

Copy and run the **three commands** shown there. They will look something like this (replace `YOUR-USERNAME` with your actual GitHub username):

```bash
git remote add origin https://github.com/YOUR-USERNAME/online-mcq-app.git
git branch -M main
git push -u origin main
```

## Step 7: Verify
Refresh your GitHub repository page. You should see all your files listed there!
