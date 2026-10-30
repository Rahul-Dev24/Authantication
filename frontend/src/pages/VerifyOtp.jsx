
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { baseUrl } from "../App";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { AppData } from "../context/AppContext";

export default function OtpVerification() {
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [seconds, setSeconds] = useState(30);
    const [error, setError] = useState("");
    const [verified, setVerified] = useState(false);

    const navigate = useNavigate();
    const { setUser, setIsAuth } = AppData();

    const inputRefs = useRef([]);

    const email = localStorage.getItem("email");

    // Countdown timer
    useEffect(() => {
        if (seconds <= 0) return;

        const timer = setTimeout(() => {
            setSeconds((prev) => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [seconds]);

    // Handle OTP input
    const handleChange = (value, index) => {
        if (!/^\d?$/.test(value)) return;

        const updatedOtp = [...otp];
        updatedOtp[index] = value;
        setOtp(updatedOtp);
        setError("");

        if (value && index < otp.length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    // Handle backspace
    const handleKeyDown = (e, index) => {
        if (
            e.key === "Backspace" &&
            !otp[index] &&
            index > 0
        ) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    // Handle pasted OTP
    const handlePaste = (e) => {
        e.preventDefault();

        const pastedValue = e.clipboardData
            .getData("text")
            .replace(/\D/g, "")
            .slice(0, 6);

        if (!pastedValue) return;

        const updatedOtp = Array(6).fill("");

        pastedValue.split("").forEach((digit, index) => {
            updatedOtp[index] = digit;
        });

        setOtp(updatedOtp);
        setError("");

        inputRefs.current[
            Math.min(pastedValue.length, 5)
        ]?.focus();
    };

    // Verify OTP
    const handleVerify = async (e) => {
        e.preventDefault();

        const enteredOtp = otp.join("");

        if (enteredOtp.length !== 6) {
            setError("Please enter the complete 6-digit OTP.");
            return;
        }

        try {
            const { data } = await axios.post(`${baseUrl}/verifyOtp`, {
                otp: enteredOtp,
                email: email
            },
                {
                    withCredentials: true
                }
            );
            toast.success(data?.message);
            setIsAuth(true);
            setUser(data?.user);
            navigate("/");
            localStorage.removeItem("email");
        } catch (err) {
            toast.error(err?.response?.data?.message);
        }
    };

    // Resend OTP
    const handleResend = () => {
        if (seconds > 0) return;

        setOtp(["", "", "", "", "", ""]);
        setSeconds(30);
        setError("");
        setVerified(false);

        inputRefs.current[0]?.focus();

        // Call your backend resend OTP API here.
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10">
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl sm:p-10">
                {/* Icon */}
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.8}
                        stroke="currentColor"
                        className="h-8 w-8 text-blue-600"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.5 10.5V6.75a4.5 4.5 0 0 0-9 0v3.75m-1.5 0h12A1.5 1.5 0 0 1 19.5 12v7.5A1.5 1.5 0 0 1 18 21H6a1.5 1.5 0 0 1-1.5-1.5V12A1.5 1.5 0 0 1 6 10.5Z"
                        />
                    </svg>
                </div>

                {/* Heading */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Verify your email
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-gray-500">
                        We have sent a 6-digit verification code to
                    </p>

                    <p className="mt-1 font-semibold text-gray-800">
                        {email}
                    </p>
                </div>

                {/* OTP Form */}
                <form onSubmit={handleVerify}>
                    <label className="mb-3 block text-sm font-medium text-gray-700">
                        Enter verification code
                    </label>

                    <div className="flex justify-between gap-2 sm:gap-3">
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => (inputRefs.current[index] = el)}
                                type="text"
                                inputMode="numeric"
                                autoComplete={index === 0 ? "one-time-code" : "off"}
                                maxLength={1}
                                value={digit}
                                onChange={(e) =>
                                    handleChange(e.target.value, index)
                                }
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                onPaste={handlePaste}
                                aria-label={`OTP digit ${index + 1}`}
                                className="h-12 w-10 rounded-lg border border-gray-300 text-center text-xl font-semibold text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-14 sm:w-12"
                            />
                        ))}
                    </div>

                    {error && (
                        <p role="alert" className="mt-4 text-sm text-red-600">
                            {error}
                        </p>
                    )}

                    {verified && (
                        <p className="mt-4 text-sm text-green-600">
                            OTP verified successfully!
                        </p>
                    )}

                    {/* Verify Button */}
                    <button
                        type="submit"
                        className="mt-7 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
                    >
                        Verify OTP
                    </button>
                </form>

                {/* Resend OTP */}
                <div className="mt-6 text-center text-sm">
                    {seconds > 0 ? (
                        <p className="text-gray-500">
                            Didn't receive the code? Resend in{" "}
                            <span className="font-semibold text-blue-600">
                                00:{String(seconds).padStart(2, "0")}
                            </span>
                        </p>
                    ) : (
                        <p className="text-gray-500">
                            Didn't receive the code?{" "}
                            <button
                                type="button"
                                onClick={handleResend}
                                className="font-semibold text-blue-600 hover:text-blue-700"
                            >
                                Resend OTP
                            </button>
                        </p>
                    )}
                </div>

                {/* Back to Login */}
                <div className="mt-8 border-t border-gray-100 pt-6 text-center">
                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="text-sm font-medium text-gray-600 transition hover:text-blue-600"
                    >
                        ← Back to login
                    </button>
                </div>
            </div>
        </div>
    );
}
