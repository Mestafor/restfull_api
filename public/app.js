/*
* Frontend Logic for the Application
*
*/

// Container for the frontend application
const app = {};

// Config
app.config = {
  sessionToken: false,
};

// Ajax Client (for the restful API)
app.client = {};

// Interface for making API calls
app.client.request = (headers, path, method, queryStringObject, payload, callback) => {
  // Set defaults
  const _headers = typeof headers === 'object' && headers !== null ? headers : {};
  const _path = typeof path === 'string' ? path : '/';
  const _method = typeof method === 'string' && ['POST', 'GET', 'PUT', 'DELETE'].includes(method) ? method : 'GET';
  const _queryStringObject = typeof queryStringObject === 'object' && queryStringObject !== null ? queryStringObject : {};
  const _payload = typeof payload === 'object' && payload !== null ? payload : {};
  const _callback = typeof callback === 'function' ? callback : false;

  // For each query string parameters sent, add it to the path
  let requestUrl = `${_path}?`;
  let counter = 0;
  Object.entries(_queryStringObject)
    .forEach(([key, value]) => {
      counter++;

      // If at least one query string parameter has already been added, prepend new ones with an ampersant
      if (counter > 1) {
        requestUrl += '&';
      }

      // Add the key and value
      requestUrl += `${key}=${value}`;
    });


  // Form the http request as a JSON type
  const xhr = new XMLHttpRequest();
  xhr.open(_method, requestUrl, true);
  xhr.setRequestHeader('Content-type', 'application/json');

  // For each headersent, add it to the request
  Object.entries(_headers)
    .forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

  // If there is a current session token set, add that to that as a header
  if (app.config.sessionToken) {
    xhr.setRequestHeader('token', app.config.sessionToken.id);
  }

  // When the request comes back, handle the response
  xhr.onreadystatechange = () => {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      const statusCode = xhr.status;
      const responseReturned = xhr.responseText;

      // Callback if requested
      if (_callback) {
        try {
          const parsedResponse = JSON.parse(responseReturned);
          _callback(statusCode, parsedResponse);
        } catch (e) {
          _callback(statusCode, false);
        }
      }
    }
  };

  // Set the payload ad JSON
  const payloadString = JSON.stringify(_payload);
  xhr.send(payloadString);
};


// Bind the forms
app.bindForms = () => {
  if (document.querySelector('form')) {
    const allForms = document.querySelectorAll('form');
    Array.from(allForms).forEach((form) => {
      form.addEventListener('submit', function (e) {
        // Stop it from submitting
        e.preventDefault();
        const formId = this.id;
        const path = this.action;
        let method = this.method.toUpperCase();

        // Hide the error message (if it's currently shown due to a previous error)
        document.querySelector(`#${formId} .formError`).style.display = 'none';

        // Hide the success message (if it's currently shown due to a previous error)
        if (document.querySelector(`#${formId} .formSuccess`)) {
          document.querySelector(`#${formId} .formSuccess`).style.display = 'none';
        }


        // Turn the inputs into a payload
        const payload = {};
        const elements = this.elements;
        for (let i = 0; i < elements.length; i++) {
          if (elements[i].type !== 'submit') {
            // Determine class of element and set value accordingly
            const classOfElement = typeof (elements[i].classList.value) === 'string' && elements[i].classList.value.length > 0 ? elements[i].classList.value : '';
            const valueOfElement = elements[i].type === 'checkbox' && classOfElement.indexOf('multiselect') === -1 ? elements[i].checked : classOfElement.indexOf('intval') === -1 ? elements[i].value : parseInt(elements[i].value, 10);
            const elementIsChecked = elements[i].checked;
            // Override the method of the form if the input's name is _method
            let nameOfElement = elements[i].name;
            if (nameOfElement === '_method') {
              method = valueOfElement;
            } else {
              // Create an payload field named "method" if the elements name is actually httpmethod
              if (nameOfElement === 'httpmethod') {
                nameOfElement = 'method';
              }
              // If the element has the class "multiselect" add its value(s) as array elements
              if (classOfElement.indexOf('multiselect') > -1) {
                if (elementIsChecked) {
                  payload[nameOfElement] = typeof (payload[nameOfElement]) === 'object' && payload[nameOfElement] instanceof Array ? payload[nameOfElement] : [];
                  payload[nameOfElement].push(valueOfElement);
                }
              } else {
                payload[nameOfElement] = valueOfElement;
              }
            }
          }
        }

        // If the method is DELETE, the payload should be a queryStringObject instead
        const queryStringObject = method === 'DELETE' ? payload : {};

        // Call the API
        app.client.request(undefined, path, method, queryStringObject, payload, (statusCode, responsePayload) => {
          // Display an error on the form if needed
          if (statusCode !== 200) {
            if (statusCode === 403) {
              // log the user out
              // app.logUserOut();
            } else {
              // Try to get the error from the api, or set a default error message
              const error = typeof (responsePayload.Error) === 'string' ? responsePayload.Error : 'An error has occured, please try again';

              // Set the formError field with the error text
              document.querySelector(`#${formId} .formError`).innerHTML = error;

              // Show (unhide) the form error field on the form
              document.querySelector(`#${formId} .formError`).style.display = 'block';
            }
          } else {
            console.log(payload, responsePayload);
            // If successful, send to form response processor
            // app.formResponseProcessor(formId, payload, responsePayload);
          }
        });
      });
    });
  }
};

// Form response processor
app.formResponseProcessor = (formId, requestPayload, responsePayload) => {
  // If account creation was successful, try to immediately log the user in
  if (formId === 'accountCreate') {
    // Take the phone and password, and use it to log the user in
    const newPayload = {
      phone: requestPayload.phone,
      password: requestPayload.password,
    };

    app.client.request(undefined, 'api/tokens', 'POST', undefined, newPayload, (newStatusCode, newResponsePayload) => {
      // Display an error on the form if needed
      if (newStatusCode !== 200) {
        // Set the formError field with the error text
        document.querySelector(`#${formId} .formError`).innerHTML = 'Sorry, an error has occured. Please try again.';

        // Show (unhide) the form error field on the form
        document.querySelector(`#${formId} .formError`).style.display = 'block';
      } else {
        // If successful, set the token and redirect the user
        app.setSessionToken(newResponsePayload);
        window.location = '/checks/all';
      }
    });
  }
  // If login was successful, set the token in localstorage and redirect the user
  if (formId === 'sessionCreate') {
    app.setSessionToken(responsePayload);
    window.location = '/checks/all';
  }

  // If forms saved successfully and they have success messages, show them
  const formsWithSuccessMessages = ['accountEdit1', 'accountEdit2'];
  if (formsWithSuccessMessages.indexOf(formId) > -1) {
    document.querySelector(`#${formId} .formSuccess`).style.display = 'block';
  }

  // If the user just deleted their account, redirect them to the account-delete page
  if (formId === 'accountEdit3') {
    app.logUserOut(false);
    window.location = '/account/deleted';
  }

  // If the user just created a new check successfully, redirect back to the dashboard
  if (formId === 'checksCreate') {
    window.location = '/checks/all';
  }
};

// Init (bootstrapping)
app.init = () => {
  // Bind all form submission
  app.bindForms();
};

// Call the init proccesses after the window loads
window.onload = () => {
  app.init();
};
