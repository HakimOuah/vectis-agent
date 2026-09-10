const button = document.getElementById('copy');
button.addEventListener('click', async () => {
  const status = document.getElementById('copystatus');
  try {
    await navigator.clipboard.writeText(document.getElementById('commands').textContent);
    status.textContent = 'Commands copied.';
  } catch {
    status.textContent = 'Copy unavailable. Select and copy the commands above.';
  }
});
