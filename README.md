# LS Schneider Course Template

#### This repo contains private content held on behalf of L3 and Schneider

## Contents
1. [Overview - How to create an HTML5 course](#1-overview---how-to-create-an-html5-course)
2. [Folder structure explained](#2-folder-structure-explained)
3. [How to convert a SWF-format FLA to an HTML5-format FLA…](#3-how-to-convert-a-swf-format-fla-to-an-html5-format-fla)
4. […and specifically how to convert ActionScript to JavaScript](#4-and-specifically-how-to-convert-actionscript-to-javascript)
5. [What CreateJS offers, and how to find out more](#5-what-createjs-offers-and-how-to-find-out-more)
6. [How to use (and hack!) the SCORMgen-HTML5.js script](#6-how-to-use-and-hack-the-scormgen-html5js-script)
7. [What Triframe is, and how it works](#7-what-triframe-is-and-how-it-works)
8. [Integrating Triframe buttons with Timeline scripts](#8-integrating-triframe-buttons-with-timeline-scripts)
9. [Git CLI 101](#9-git-cli-101)
10. [Testing an HTML5 package with SCORM Cloud](#10-testing-an-html5-package-with-scorm-cloud)


## 1. Overview - How to create an HTML5 course

This README will guide you through the process of converting an existing (SWF-based) 
course to HTML5, or creating a new HTML5 course from scratch. 

#### What’s in a course repo?

Each course has its own GitHub repo, named something like ‘2016\_2Q\_Sustainment\_Supp\_CD’. 
This is true when two courses are very similar (eg a ‘company drivers’ version of a ‘independent contractors’ course). 
Each repo is self-contained — it contains a single SCORM package, along with 
all the related working files, admin documents, and build-scripts. 

#### Creating a new course repo

Whether you’re converting an existing course, or creating a new one, you’ll need 
to copy the [L3\_Schneider\_Course\_Template](https://github.com/MakemediaLtd/L3_Schneider_Course_Template) repo. 
For this, you will need admin rights on the MakemediaLtd GitHub account. It’s not 
possible to ‘fork’ a repo within the same GitHub account, so instead: 

1.  In a browser, create a new MakemediaLtd GitHub repo, named ‘2016\_2Q\_Sustainment\_Supp\_CD’:  
    - Visit [https://github.com/new](https://github.com/new)
    - Owner: _MakemediaLtd_
    - Repository name: _2016\_2Q\_Sustainment\_Supp\_CD_
    - Private: make sure this is selected
    - Click ‘Create repository’
    - Make a note of the URL, `https://github.com/MakemediaLtd/2016_2Q_Sustainment_Supp_CD.git`
2.  Open a Command Prompt (Windows) or Terminal (Mac or Linux)
3.  Change to your L3-Schneider work folder, eg:  
    `cd /d "%HOMEDRIVE%%HOMEPATH%\Documents\L3-Schneider"` (Windows)  
    `cd ~/Documents/L3-Schneider` (Mac or Linux)
4.  Clone the template repo from GitHub to your local machine, with the new name:  
    `git clone https://github.com/MakemediaLtd/L3_Schneider_Course_Template 2016_2Q_Sustainment_Supp_CD` (Any OS)
5.  Change to the local repo folder:  
    `cd 2016_2Q_Sustainment_Supp_CD` (Any OS)
6.  Break the link with the template repo, by renaming it ‘template’:  
    `git remote rename origin template` (Any OS)
7.  Add the new origin, created during step 1, above:  
    `git remote add origin https://github.com/MakemediaLtd/2016_2Q_Sustainment_Supp_CD.git` (Any OS)
8.  Push the template files to the new GitHub repo, and set the default upstream link:  
    `git push -u origin master` (Any OS)
9.  __IMPORTANT:__ In README.md, change the first line - this will become the learner-readable SCORM-package title, eg:  
    `# 2016 2Q Sustainment Supplement, Company Drivers`
10. Test that commiting and pushing works as expected:  
    `git commit -am 'correct SCORM-package title'`
11. From now on, you can `git push` without needing the `origin master` part:  
    `git push`
12. Refresh your GitHub browser page at https://github.com/MakemediaLtd/2016\_2Q\_Sustainment\_Supp\_CD…  
    you should see the correct course title. Note that the original L3\_Schneider\_Course\_Template repo has not been changed!


## 2. Folder structure explained

@todo


## 3. How to convert a SWF-format FLA to an HTML5-format FLA...

@todo


## 4. ...and specifically how to convert ActionScript to JavaScript

@todo


## 5. What CreateJS offers, and how to find out more

@todo


## 6. How to use (and hack!) the SCORMgen-HTML5.js script

@todo


## 7. What Triframe is, and how it works

@todo


## 8. Integrating Triframe buttons with Timeline scripts

@todo


## 9. Git CLI 101

@todo


## 10. Testing an HTML5 package with SCORM Cloud

@todo


