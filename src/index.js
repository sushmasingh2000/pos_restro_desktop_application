import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from "react-query";
import { Provider } from 'react-redux';
import store, { persistor } from './Shared/redux/store/store';
import { PersistGate } from 'redux-persist/integration/react';
import 'bootstrap/dist/css/bootstrap.min.css';
 

const queryClient = new QueryClient();
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <App />
          <Toaster
            toastOptions={{
              className: "",
              style: {
                border: `1px solid `,
                color: "#25D366",
                fontSize: "15px",
                marginBottom: "100px",
                borderRadius: "10px",
              },
            }}
            autoClose={1000}
            limit={1}
          />
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  </React.StrictMode>
);

reportWebVitals();
