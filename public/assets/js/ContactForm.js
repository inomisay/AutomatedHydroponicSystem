document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    const errorMessageElement = document.getElementById('errorMessage');
    const sentMessageElement = document.getElementById('sentMessage');
    const submitButton = document.getElementById('submitButton');

    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        submitButton.textContent = 'Sending...';
        submitButton.disabled = true;
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

            // The server may answer with a non-JSON error page (e.g. a proxy 502)
            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(result.message || "Sorry, we couldn't send your message. Please try again later.");
            }

            sentMessageElement.style.display = 'block';
            form.reset(); // Clear the form fields after successful submission
        } catch (error) {
            console.error('Error sending message:', error);
            errorMessageElement.textContent = error.message;
            errorMessageElement.style.display = 'block';
        } finally {
            submitButton.textContent = 'Send Message';
            submitButton.disabled = false;
        }
    });
});
