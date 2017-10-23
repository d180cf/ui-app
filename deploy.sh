#!/bin/bash

# This script is run by Travis CI after the build succeeds.
# It copies the .bin folder and sends it to d180cf/d180cf.github.io repo
# in a commit with a message like "Build 123 (d180cf/ui-app master 1ef8c97)"

set -e # exit with nonzero exit code if anything fails

if [[ $TRAVIS_BRANCH == "master" && $TRAVIS_PULL_REQUEST == "false" ]]; then

echo "Starting to update ${GH_REPO}"

DESCRIPTION="Build $TRAVIS_BUILD_NUMBER ($TRAVIS_REPO_SLUG $TRAVIS_BRANCH $TRAVIS_COMMIT)"
DESTINATION=$HOME/tsumego-js-ui-app

#copy data we're interested in to other place
cp -R .bin $DESTINATION

#create a file with the build info
echo $DESCRIPTION > $DESTINATION/.build

#go to home and setup git
cd $HOME
git config --global user.email "d180cf@gmail.com"
git config --global user.name "d180cf (via Travis CI)"

echo "Cloning the repo..."
git clone https://${GH_TOKEN}@github.com/${GH_USER}/${GH_REPO} repo

echo "Copying the site files..."
cd repo
cp -Rf $DESTINATION/* .

echo "Creating a new commit..."
git add -f .
git commit -m $DESCRIPTION

echo "Pushing changes..."
git push

echo "Done updating ${GH_REPO}"

else
 echo "Skipped updating ${GH_REPO}, because build is not triggered from the master branch."
fi;