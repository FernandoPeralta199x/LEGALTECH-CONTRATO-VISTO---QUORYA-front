import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes
} from "react";

import { cn } from "@/lib/cn";

type FormFieldProps = {
  children: ReactNode;
  error?: string;
  hint?: string;
  htmlFor?: string;
  label: string;
  required?: boolean;
};

const controlBase =
  "cv-input w-full disabled:cursor-not-allowed disabled:opacity-55";

function controlClass(invalid?: boolean, className?: string): string {
  return cn(
    controlBase,
    invalid
      ? "cv-input-invalid"
      : "",
    className
  );
}

export function FormField({
  children,
  error,
  hint,
  htmlFor,
  label,
  required = false
}: FormFieldProps) {
  const generatedId = useId();
  // Associação explícita (label htmlFor -> control id) em vez de label implícito
  // (que envolvia o controle e gerava HTML inválido quando o filho era composto,
  // ex.: input + botão). Para um único filho-elemento sem id, injeta o id gerado.
  const onlyChild =
    Children.count(children) === 1 ? (Children.toArray(children)[0] as ReactNode) : null;
  const childElement = isValidElement(onlyChild)
    ? (onlyChild as ReactElement<{ id?: string; "aria-describedby"?: string }>)
    : null;
  const controlId = htmlFor ?? childElement?.props.id ?? generatedId;
  const describedById = error || hint ? `${controlId}-desc` : undefined;

  // Clona o filho para (a) injetar o id gerado quando ele não tem um e não há
  // htmlFor e (b) ligar aria-describedby ao parágrafo de erro/dica, para que
  // leitores de tela anunciem a mensagem junto do controle (A11Y-01). Preserva
  // um aria-describedby já existente no filho.
  const content = childElement
    ? cloneElement(childElement, {
        ...(childElement.props.id || htmlFor ? {} : { id: controlId }),
        ...(describedById
          ? {
              "aria-describedby": [
                childElement.props["aria-describedby"],
                describedById
              ]
                .filter(Boolean)
                .join(" ")
            }
          : {})
      })
    : children;

  return (
    <div className="block">
      <label
        className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--text2)]"
        htmlFor={controlId}
      >
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {content}
      {error ? (
        <p className="mt-1.5 text-xs leading-5 text-red-700 dark:text-red-300" id={describedById}>
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs leading-5 text-[var(--text2)]" id={describedById}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export function TextInput({ className, invalid, ...props }: TextInputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={controlClass(invalid, cn("px-3", className))}
      {...props}
    />
  );
}

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export function TextArea({ className, invalid, ...props }: TextAreaProps) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={controlClass(invalid, cn("min-h-24 resize-y px-3 py-2", className))}
      {...props}
    />
  );
}

type SelectInputProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

export function SelectInput({ className, invalid, ...props }: SelectInputProps) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={controlClass(
        invalid,
        cn(
          "px-3 [color-scheme:inherit] [&_option]:bg-[var(--surf)] [&_option]:text-[var(--text)] [&_option:checked]:bg-[var(--surf2)]",
          className
        )
      )}
      {...props}
    />
  );
}
