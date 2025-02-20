document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('contactForm');
    const errorMessageElement = document.getElementById('errorMessage');
    const sentMessageElement = document.getElementById('sentMessage');
    const submitButton = document.getElementById('submitButton');

    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        submitButton.textContent = 'Sending...';
        errorMessageElement.style.display = 'none';
        sentMessageElement.style.display = 'none';

        const formData = new FormData(form);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            subject: formData.get('subject'),
            textMessage: formData.get('textMessage')
        };

        try {
            const response = await fetch('/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                submitButton.textContent = 'Send Message';
                sentMessageElement.style.display = 'block';
                form.reset(); // Clear the form fields after successful submission
            } else {
                throw new Error(result.message || 'Something went wrong, please try again later.');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            submitButton.textContent = 'Send Message';
            errorMessageElement.textContent = error.message;
            errorMessageElement.style.display = 'block';
        } finally {
            loadingElement.style.display = 'none';
        }
    });
});
