const chatForm = document.querySelector('.chatbox-form');
const chatInput = document.querySelector('.chatbox-form input');
const chatBody = document.querySelector('.chatbox-body');

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const userMessage = chatInput.value.trim();
  if (!userMessage) return;

  // Display user message
  const userMessageElement = document.createElement('div');
  userMessageElement.className = 'chat-message user';
  userMessageElement.textContent = userMessage;
  chatBody.appendChild(userMessageElement);

  // Send message to backend
  try {
    const response = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage }),
    });
    const data = await response.json();

    // Display AI response
    const botMessageElement = document.createElement('div');
    botMessageElement.className = 'chat-message bot';
    botMessageElement.textContent = data.reply;
    chatBody.appendChild(botMessageElement);
  } catch (error) {
    console.error('Error:', error);
    const errorMessageElement = document.createElement('div');
    errorMessageElement.className = 'chat-message bot';
    errorMessageElement.textContent = 'Sorry, something went wrong.';
    chatBody.appendChild(errorMessageElement);
  }

  chatInput.value = '';
});