export interface Todo {
  id: number;
  title: string;
  done: boolean;
  priority: 'high' | 'medium' | 'low';
  userId: number;
  createdAt: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  avatar: string;
  role: string;
}
