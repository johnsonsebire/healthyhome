const firebaseMock = {
  collection: jest.fn(() => firebaseMock),
  doc: jest.fn(() => firebaseMock),
  setDoc: jest.fn(() => Promise.resolve()),
  getDoc: jest.fn(() => Promise.resolve({
    exists: jest.fn(() => true),
    data: jest.fn(() => ({})),
    id: 'mock-doc-id'
  })),
  getDocs: jest.fn(() => Promise.resolve({
    docs: [],
    forEach: jest.fn()
  })),
  addDoc: jest.fn(() => Promise.resolve({ id: 'mock-doc-id' })),
  updateDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  query: jest.fn(() => firebaseMock),
  where: jest.fn(() => firebaseMock),
  orderBy: jest.fn(() => firebaseMock),
  limit: jest.fn(() => firebaseMock),
  startAfter: jest.fn(() => firebaseMock),
  serverTimestamp: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
};

export default firebaseMock;
