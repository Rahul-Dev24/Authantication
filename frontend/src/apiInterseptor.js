import axios from "axios";


const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value?.split(`; ${name}=`);
    if (parts?.length === 2) return parts?.pop()?.split(";")?.shift();
}

// const api = axios.create({
//     baseUrl: 'http://localhost:8080',
//     withCredentials: true
// });
const api = axios.create({
    baseURL: 'http://localhost:8080',
    withCredentials: true
});

api.interceptors.request.use(
    (config) => {
        if (config?.method === "post" || config?.method === "put" || config?.method === "delete") {
            const csrfToken = getCookie("csrfToken");
            if (csrfToken) {
                config.headers['x-csrf-token'] = csrfToken;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
)

let isRefersing = false;
let isRefersingCSRFToken = false;
let failedQueue = [];
let csrfFailedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
}

const processCSRFQueue = (error, token = null) => {
    csrfFailedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    csrfFailedQueue = [];
}

api.interceptors.response.use(
    (response) => {
        return response
    },
    async (error) => {
        const originalRequest = error?.config;
        if (error?.response?.status === 403 && !originalRequest?._retry) {
            const errorCode = error?.response?.data?.code || "";

            if (errorCode.startsWith("CSRF_")) {
                if (isRefersingCSRFToken) {
                    return new Promise((resolve, reject) => {
                        csrfFailedQueue.push({ resolve, reject })
                    }).then(() => {
                        return api(originalRequest);
                    })
                }
                originalRequest._retry = true;
                isRefersingCSRFToken = true;

                try {
                    await api.post("/api/v1/refres-csrf");
                    processCSRFQueue(null);
                    return api(originalRequest);
                } catch (err) {
                    processCSRFQueue(err, null);
                    return Promise.reject(err);
                } finally {
                    isRefersingCSRFToken = false;
                }
            }

            if (isRefersing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject })
                }).then(() => {
                    return api(originalRequest);
                })
            }
            originalRequest._retry = true;
            isRefersing = true

            try {
                api.post(`/api/v1/refresh`);
                processQueue(null);
                return api(originalRequest)
            } catch (err) {
                processQueue(err, null);
                return Promise.reject(err)
            } finally {
                isRefersing = false;
            }
        }
        return Promise.reject(error);
    }

)

export default api