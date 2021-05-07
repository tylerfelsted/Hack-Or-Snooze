$(async function () {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $favoritedArticles = $("#favorited-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navUserProfile = $("#nav-user-profile");
  const $navSubmit = $("#nav-submit");
  const $navFavorites = $("#nav-favorites");
  const $navMyStories = $("#nav-my-stories");

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function () {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function () {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event Handler for Clicking Submit
   */

  $navSubmit.on("click", function () {
    hideElements();
    $submitForm.show();
    $allStoriesList.show();
  });

  /**
   * Event Handler for Clicking Favorites
   */

  $navFavorites.on("click", function () {
    hideElements();
    $favoritedArticles.empty().show();
    appendStories(currentUser.favorites.stories, $favoritedArticles);
  })

  /**
   * Event Handler for Clicking My Stories
   */

  $navMyStories.on("click", function () {
    hideElements();
    $ownStories.empty().show();
    appendStories(currentUser.ownStories.stories, $ownStories);
    addDeleteButton();
  })

  /**
   * Event Handler for Submitting a New Story
   */

  $submitForm.on("submit", async function (e) {
    e.preventDefault;
    const newStory = {
      author: $("#author").val(),
      title: $("#title").val(),
      url: $("#url").val()
    }
    const story = await storyList.addStory(currentUser, newStory);
    const result = generateStoryHTML(story);
    hideElements();
    $allStoriesList.prepend(result).show();

  });

  /**
   * Event Handler for Adding a new Favorite Story
   */
  $("body").on("click", ".fa-star", async function (e) {
    const storyId = e.target.parentNode.getAttribute("id");
    //If the story is not already favorited
    if (!checkIfFavorite(storyId)) {
      //Make request to the api to add a story to favorites
      await currentUser.addFavorite(storyId);

      //Get the story object and add it to the currentUser.favorites list
      const favStory = storyList.getStoryById(storyId);
      currentUser.favorites.addStoryToList(favStory);

      //Update the star icon to solid
      $(e.target).removeClass("far").addClass("fas");

      //If the story is already favorited
    } else {

      //Make request to the api to remove the story from favorites
      await currentUser.deleteFavorite(storyId);

      //remove the story from the currentUser.favorites list
      currentUser.favorites.removeStoryFromList(storyId);

      //Update the star icon to regular
      $(e.target).removeClass("fas").addClass("far");
    }
  });


  /**
   * Event Handler for Deleting a Story
   */

  $("body").on("click", ".fa-trash-alt", async function (e) {
    const storyId = e.target.parentNode.getAttribute("id");

    //Make request to the API to delete the story
    await storyList.deleteStory(currentUser, storyId);
    //Remove story from DOM
    $(e.target.parentNode).remove();

    //Remove story from lists
    currentUser.ownStories.removeStoryFromList(storyId);
    currentUser.favorites.removeStoryFromList(storyId);
  })

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function () {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();
    // loop through all of our stories and generate HTML for them
    appendStories(storyList.stories, $allStoriesList);

  }

  /**
   * A function which takes a given storyId and checks to see if it is
   * a favorited story
   */

  function checkIfFavorite(storyId) {
    for (let story of currentUser.favorites.stories) {
      if (story.storyId === storyId) {
        return true;
      }
    }

    return false;
  }

  /**
   * A function which loops through all stories in an array and generates 
   * html for them, and then appends them to the DOM
  */

  function appendStories(storyArray, $element) {
    for (let story of storyArray) {
      const result = generateStoryHTML(story);
      $element.append(result);
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function addDeleteButton() {
    $("#my-articles li").prepend('<i class="fas fa-trash-alt"></i>');
  }


  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);

    let starHTML = "";



    //If someone is logged in
    if (currentUser) {
      //Check to see if the story is favorited to display the correct star
      if (checkIfFavorite(story.storyId)) {
        starHTML = '<i class="fas fa-star"></i>';
      } else {
        starHTML = '<i class="far fa-star"></i>'
      }
    } else {
      starHTML = '<i class="far fa-star"></i>'
    }

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
      ${starHTML}
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $favoritedArticles,
      $ownStories,
      $loginForm,
      $createAccountForm
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  /**
   * Change the nav bar if a user is logged in
   */

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $("#main-nav-links").show();
    $navUserProfile.text(localStorage.getItem("username")).show();
    $navLogOut.show();
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
