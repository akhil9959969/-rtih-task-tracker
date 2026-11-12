<?php
/**
 * Server-side validation. The frontend validates too, but the backend
 * never trusts it - every rule is enforced again here.
 */

declare(strict_types=1);

const TASK_STATUSES = ['Pending', 'In Progress', 'Completed'];

/** @return array<string,string> field => friendly error message */
function validate_credentials_input(string $name, string $email, string $password, bool $requireName): array
{
    $errors = [];
    if ($requireName && trim($name) === '') {
        $errors['name'] = 'Please enter your name.';
    }
    if (trim($email) === '') {
        $errors['email'] = 'Please enter your email address.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) {
        $errors['email'] = 'Please enter a valid email address.';
    }
    if ($password === '') {
        $errors['password'] = 'Please enter a password.';
    } elseif (strlen($password) < 8) {
        $errors['password'] = 'Please use at least 8 characters for the password.';
    }
    return $errors;
}

/** @return array<string,string> field => friendly error message */
function validate_task_input(string $title, string $status): array
{
    $errors = [];
    if (trim($title) === '') {
        $errors['title'] = 'Please enter a task title.';
    } elseif (mb_strlen(trim($title)) > 200) {
        $errors['title'] = 'Please keep the title under 200 characters.';
    }
    if (!in_array($status, TASK_STATUSES, true)) {
        $errors['status'] = 'Please select a valid task status.';
    }
    return $errors;
}

/** Parse a positive integer id from request data; null when invalid. */
function parse_task_id(mixed $value): ?int
{
    if (is_int($value)) {
        return $value > 0 ? $value : null;
    }
    if (is_string($value) && preg_match('/^\d+$/', $value) === 1) {
        $id = (int) $value;
        return $id > 0 ? $id : null;
    }
    return null;
}
