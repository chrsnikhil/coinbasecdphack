export async function runAgentAction(action: string, params: any) {
  try {
    const response = await fetch('/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, params }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to run agent action');
    }

    return await response.json();
  } catch (error) {
    console.error('Error running agent action:', error);
    throw error;
  }
}

export async function checkAgentStatus() {
  try {
    const response = await fetch('/api/agent');
    if (!response.ok) {
      throw new Error('Failed to check agent status');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking agent status:', error);
    throw error;
  }
} 