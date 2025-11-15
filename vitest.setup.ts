import '@testing-library/jest-dom';
import React from 'react';

// Make React globally available for JSX in tests
(global as Record<string, unknown>).React = React;

// Mock Supabase environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
