import { useState } from 'react';

export default function AuthTest() {
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const testLogin = async () => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: 'admin@example.com',
                    password: 'your_admin_password',
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setResult(data);
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const testSignup = async () => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('http://localhost:3000/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: `test${Date.now()}@example.com`,
                    password: 'testpassword123',
                    firstName: 'Test',
                    lastName: 'User',
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setResult(data);
            } else {
                setError(data.error || 'Signup failed');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
                <h1 className="text-3xl font-bold mb-6">Auth API Test</h1>

                <div className="space-y-4 mb-6">
                    <button
                        onClick={testLogin}
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
                    >
                        {loading ? 'Testing...' : 'Test Login (Admin)'}
                    </button>

                    <button
                        onClick={testSignup}
                        disabled={loading}
                        className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold"
                    >
                        {loading ? 'Testing...' : 'Test Signup (New User)'}
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">
                        <h3 className="font-semibold mb-2">Error:</h3>
                        <pre className="text-sm">{error}</pre>
                    </div>
                )}

                {result && (
                    <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">Success:</h3>
                        <pre className="text-sm overflow-auto max-h-96">
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    </div>
                )}

                <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                    <h3 className="font-semibold mb-2">Test Credentials:</h3>
                    <p className="text-sm">
                        <strong>Email:</strong> admin@example.com<br />
                        <strong>Password:</strong> your_admin_password
                    </p>
                </div>
            </div>
        </div>
    );
}
