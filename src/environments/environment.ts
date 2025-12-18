export const environment = {
  production: false,
  firebase: {
    apiKey: "AIzaSyDCZ0pq3ngb6VqT1ake7wvxucoHJpexeDA",
    authDomain: "donatebloodv1.firebaseapp.com",
    databaseURL: "https://donatebloodv1-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "donatebloodv1",
    storageBucket: "donatebloodv1.firebasestorage.app",
    messagingSenderId: "759565481446",
    appId: "1:759565481446:web:98cf7ff04604a121bbd227",
    measurementId: "G-PMCQS5ZVCR"
  }
};

export const url = {
  api: 'http://localhost:5001/donatebloodv1/asia-southeast1/api',
  redis: 'redis://localhost:6379',
  firebase: 'https://donatebloodv1.firebaseapp.com',
  firebaseStorage: 'https://donatebloodv1.firebasestorage.app',
  firebaseDatabase: 'https://donatebloodv1-default-rtdb.asia-southeast1.firebasedatabase.app',
  firebaseAuth: 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyDCZ0pq3ngb6VqT1ake7wvxucoHJpexeDA',
  firebaseAuthSignUp: 'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyDCZ0pq3ngb6VqT1ake7wvxucoHJpexeDA',
  firebaseAuthSignIn: 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyDCZ0pq3ngb6VqT1ake7wvxucoHJpexeDA',
  firebaseAuthSignOut: 'https://identitytoolkit.googleapis.com/v1/accounts:signOut?key=AIzaSyDCZ0pq3ngb6VqT1ake7wvxucoHJpexeDA',
  firebaseAuthSignInWithEmailAndPassword: 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyDCZ0pq3ngb6VqT1ake7wvxucoHJpexeDA',
}

export const apiRoutes = {
  events: {
    searchFilter: '/v1/events/search-filter',
    syncRedis: '/v1/events/sync-redis',
  },
  users: '/v1/users',
  tickets: '/v1/tickets',
  subscriptions: '/v1/subscriptions',
  follows: '/v1/follows',
  reactions: '/v1/reactions',
  comments: '/v1/comments',
  notifications: '/v1/notifications',
  messages: '/v1/messages',
  payments: '/v1/payments',
}
