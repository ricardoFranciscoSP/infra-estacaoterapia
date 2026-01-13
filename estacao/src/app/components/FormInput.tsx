"use client";
import React from "react";

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    className?: string;
    value?: string | number;
    // React Hook Form register pode passar ref e outras props
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>((props, ref) => {
    return (
        <input ref={ref} {...props} />
    );
});
FormInput.displayName = "FormInput";
