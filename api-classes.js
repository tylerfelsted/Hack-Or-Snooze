const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";

/**
 * This class maintains the list of individual Story instances
 *  It also has some methods for fetching, adding, and removing stories
 */

class StoryList {
  constructor(stories) {
    this.stories = stories;
  }

  /**
   * This method is designed to be called to generate a new StoryList.
   *  It:
   *  - calls the API
   *  - builds an array of Story instances
   *  - makes a single StoryList instance out of that
   *  - returns the StoryList instance.*
   */

  // Note the presence of `static` keyword: this indicates that getStories
  // is **not** an instance method. Rather, it is a method that is called on the
  // class directly. Why doesn't it make sense for getStories to be an instance method?

  static async getStories() {
    // query the /stories endpoint (no auth required)
    const response = await axios.get(`${BASE_URL}/stories`);

    // turn the plain old story objects from the API into instances of the Story class
    const stories = response.data.stories;
    const storyList = StoryList.buildStoryList(stories);

    // .map(story => new Story(story));

    // build an instance of our own class using the new array of stories
    // const storyList = new StoryList(stories);
    return storyList;
  }

  /**
   * Method to make an array of Story objects from an array returned by the API.
   * The array of Story objects is then made into its own StoryList object
   * Returns the StoryList object
   */
  static buildStoryList(stories) {
    const storyArray = stories.map(story => new Story(story));
    const storyList = new StoryList(storyArray);
    return storyList;
  }

  /**
   * Method to add a story to a storyList. It adds the story to the front of the array
   */
  addStoryToList(story) {
    this.stories.unshift(story);
  }

  /**
   * Method to remove a story from a storyList. Uses the passed in
   * storyId to find and remove the correct story.
   */
  removeStoryFromList(storyId) {
    let index;
    for (let i = 0; i < this.stories.length; i++) {
      if (this.stories[i].storyId === storyId) {
        index = i;
      }
    }
    if (index !== undefined) {
      this.stories.splice(index, 1)
    }
  }

  /**
   * Function that takes a story id and returns a story object if it is found within 
   * the storylist
   * storyId - the id of the story you want returned
   * returns a story, otherwise it returns undefined.
   */

  getStoryById(storyId) {
    for (let story of this.stories) {
      if (story.storyId === storyId) {
        return story;
      }
    }

    return;
  }

  /**
   * Method to make a POST request to /stories and add the new story to the list
   * - user - the current instance of User who will post the story
   * - newStory - a new story object for the API with title, author, and url
   *
   * Returns the new story object
   */

  async addStory(user, newStory) {

    //post request, add a new story.
    const response = await axios.post(`${BASE_URL}/stories`, {
      token: user.loginToken,
      story: newStory
    })

    const storyObj = {
      author: newStory.author,
      title: newStory.title,
      url: newStory.url,
      username: response.data.story.username,
      storyId: response.data.story.storyId,
      createdAt: response.data.story.createdAt,
      updatedAt: response.data.story.updatedAt
    }

    const story = new Story(storyObj);
    this.addStoryToList(story);
    user.ownStories.addStoryToList(story);
    return story;
  }

  /**
   * Method to make a DELETE request to remove a story
   * user - used to get the proper authentication token
   * storyId - passed into the url to delete the selected story
   */
  async deleteStory(user, storyId) {
    await axios.delete(`${BASE_URL}/stories/${storyId}`, {
      data: {
        token: user.loginToken
      }
    });
  }
}


/**
 * The User class to primarily represent the current user.
 *  There are helper methods to signup (create), login, and getLoggedInUser
 */

class User {
  constructor(userObj) {
    this.username = userObj.username;
    this.name = userObj.name;
    this.createdAt = userObj.createdAt;
    this.updatedAt = userObj.updatedAt;

    // these are all set to defaults, not passed in by the constructor
    this.loginToken = "";
    this.favorites = [];
    this.ownStories = [];
  }

  /* Create and return a new user.
   *
   * Makes POST request to API and returns newly-created user.
   *
   * - username: a new username
   * - password: a new password
   * - name: the user's full name
   */

  static async create(username, password, name) {
    const response = await axios.post(`${BASE_URL}/signup`, {
      user: {
        username,
        password,
        name
      }
    });

    // build a new User instance from the API response
    const newUser = new User(response.data.user);

    // attach the token to the newUser instance for convenience
    newUser.loginToken = response.data.token;

    return newUser;
  }

  /* Login in user and return user instance.

   * - username: an existing user's username
   * - password: an existing user's password
   */

  static async login(username, password) {
    const response = await axios.post(`${BASE_URL}/login`, {
      user: {
        username,
        password
      }
    });

    // build a new User instance from the API response
    const existingUser = new User(response.data.user);

    // instantiate Story instances for the user's favorites and ownStories

    existingUser.favorites = StoryList.buildStoryList(response.data.user.favorites);
    existingUser.ownStories = StoryList.buildStoryList(response.data.user.stories);

    // existingUser.favorites = response.data.user.favorites.map(s => new Story(s));
    // existingUser.ownStories = response.data.user.stories.map(s => new Story(s));

    // attach the token to the newUser instance for convenience
    existingUser.loginToken = response.data.token;

    return existingUser;
  }

  /** Get user instance for the logged-in-user.
   *
   * This function uses the token & username to make an API request to get details
   *   about the user. Then it creates an instance of user with that info.
   */

  static async getLoggedInUser(token, username) {
    // if we don't have user info, return null
    if (!token || !username) return null;

    // call the API
    const response = await axios.get(`${BASE_URL}/users/${username}`, {
      params: {
        token
      }
    });

    // instantiate the user from the API information
    const existingUser = new User(response.data.user);

    // attach the token to the newUser instance for convenience
    existingUser.loginToken = token;


    // instantiate StoryList instances for the user's favorites and ownStories
    existingUser.favorites = StoryList.buildStoryList(response.data.user.favorites);
    existingUser.ownStories = StoryList.buildStoryList(response.data.user.stories);


    return existingUser;
  }

  /**
   * Method that makes a POST request to add a story to favorites
   */
  async addFavorite(storyId) {

    await axios.post(`${BASE_URL}/users/${this.username}/favorites/${storyId}`, {
      token: this.loginToken
    });
  }

  /**
   * Method that makes a DELETE request to remove a story from favorites
   */
  async deleteFavorite(storyId) {
    await axios.delete(`${BASE_URL}/users/${this.username}/favorites/${storyId}`, {
      data: {
        token: this.loginToken
      }
    });
  }
}

/**
 * Class to represent a single story.
 */

class Story {

  /**
   * The constructor is designed to take an object for better readability / flexibility
   * - storyObj: an object that has story properties in it
   */

  constructor(storyObj) {
    this.author = storyObj.author;
    this.title = storyObj.title;
    this.url = storyObj.url;
    this.username = storyObj.username;
    this.storyId = storyObj.storyId;
    this.createdAt = storyObj.createdAt;
    this.updatedAt = storyObj.updatedAt;
  }
}