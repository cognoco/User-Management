'use client';

import { useState, useEffect } from 'react';
import { UserType } from '@/types/user-type';
import { useUserManagement } from '@/lib/auth/UserManagementProvider';
import { Button } from '@/ui/primitives/button';
import { Input } from '@/ui/primitives/input';
import { Label } from '@/ui/primitives/label';
import { RadioGroup, RadioGroupItem } from '@/ui/primitives/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert';
import { Check, X, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { OAuthButtons } from './OAuthButtons';
import { PasswordRequirements } from './PasswordRequirements';
import { RegistrationForm as HeadlessRegistrationForm } from '@/ui/headless/auth/RegistrationForm';
import { registerUserViaApi } from '@/lib/api/auth/register';

export function RegistrationForm() {
  const userManagement = useUserManagement();
  const router = useRouter();
  // We will call the server API directly instead of client-side Supabase registration
  const [userType, setUserType] = useState<UserType>(userManagement.corporateUsers.defaultUserType);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [apiSuccess, setApiSuccess] = useState<string | null>(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // Handle user type change
  const handleUserTypeChange = (type: UserType) => {
    setUserType(type);
  };

  // Handle successful registration
  const handleRegistrationSuccess = (email: string) => {
    const successMsg = 'Registration successful! Please check your email to verify your account.';
    setApiSuccess(successMsg);
    setShouldRedirect(true);
    
    // Set a timer to redirect after showing success message
    setTimeout(() => {
      router.push(`/auth/check-email?email=${encodeURIComponent(email)}`);
    }, 2000);
  };

  // Debug effect to log form errors
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[RegistrationForm] Form state changed:', {
        userType,
        shouldRedirect,
        apiSuccess
      });
    }
  }, [userType, shouldRedirect, apiSuccess]);

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {!shouldRedirect && (
        <HeadlessRegistrationForm
          onSubmit={async (userData) => {
            try {
              const apiResult = await registerUserViaApi({
                email: userData.email.trim(),
                password: userData.password,
                confirmPassword: userData.confirmPassword,
                firstName: userData.firstName.trim(),
                lastName: userData.lastName.trim(),
                acceptTerms: userData.acceptTerms,
                userType,
                metadata: userData.metadata ?? {},
              });

              if (apiResult.success) {
                handleRegistrationSuccess(userData.email);
              } else if (apiResult.error) {
                throw new Error(apiResult.error);
              }
            } catch (error) {
              return Promise.reject(error);
            }
            return Promise.resolve();
          }}
          render={({
            handleSubmit,
            emailValue,
            setEmailValue,
            passwordValue,
            setPasswordValue,
            confirmPasswordValue,
            setConfirmPasswordValue,
            firstNameValue,
            setFirstNameValue,
            lastNameValue,
            setLastNameValue,
            acceptTermsValue,
            setAcceptTermsValue,
            isSubmitting,
            isValid,
            errors,
            touched,
            handleBlur
          }) => (
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="registration-form">
              <h1 className="text-2xl font-bold text-center">Create an Account</h1>
              
              {userManagement.corporateUsers.enabled && userManagement.corporateUsers.allowUserTypeChange && (
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <RadioGroup 
                    value={userType} 
                    onValueChange={(value) => handleUserTypeChange(value as UserType)}
                    className="flex flex-col space-y-2"
                    data-testid="user-type-radio-group"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem 
                        value={UserType.PRIVATE} 
                        id="user-type-private" 
                        data-testid="user-type-private"
                      />
                      <Label htmlFor="user-type-private" className="cursor-pointer">Personal</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem 
                        value={UserType.CORPORATE} 
                        id="user-type-corporate" 
                        data-testid="user-type-corporate"
                      />
                      <Label htmlFor="user-type-corporate" className="cursor-pointer">Business</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}
              
              {errors.form && (
                <Alert variant="destructive" className="bg-red-100 border-red-300 text-red-800" role="alert">
                  <X className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{errors.form}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={emailValue}
                  onChange={(e) => setEmailValue(e.target.value)}
                  onBlur={() => handleBlur('email')}
                  placeholder="your.email@example.com"
                  data-testid="email-input"
                  aria-invalid={touched.email && errors.email ? 'true' : 'false'}
                  aria-describedby={touched.email && errors.email ? 'email-error' : undefined}
                  className={touched.email && errors.email ? "border-red-500" : ""}
                />
                {touched.email && errors.email && (
                  <p id="email-error" className="text-destructive text-sm mt-1" data-testid="email-error">{errors.email}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstNameValue}
                    onChange={(e) => setFirstNameValue(e.target.value)}
                    onBlur={() => handleBlur('firstName')}
                    placeholder="First Name"
                    data-testid="first-name-input"
                    aria-invalid={touched.firstName && errors.firstName ? 'true' : 'false'}
                    aria-describedby={touched.firstName && errors.firstName ? 'first-name-error' : undefined}
                    className={touched.firstName && errors.firstName ? "border-red-500" : ""}
                  />
                  {touched.firstName && errors.firstName && (
                    <p id="first-name-error" className="text-destructive text-sm mt-1" data-testid="first-name-error">{errors.firstName}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={lastNameValue}
                    onChange={(e) => setLastNameValue(e.target.value)}
                    onBlur={() => handleBlur('lastName')}
                    placeholder="Last Name"
                    data-testid="last-name-input"
                    aria-invalid={touched.lastName && errors.lastName ? 'true' : 'false'}
                    aria-describedby={touched.lastName && errors.lastName ? 'last-name-error' : undefined}
                    className={touched.lastName && errors.lastName ? "border-red-500" : ""}
                  />
                  {touched.lastName && errors.lastName && (
                    <p id="last-name-error" className="text-destructive text-sm mt-1" data-testid="last-name-error">{errors.lastName}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-1.5 relative">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordValue}
                    onChange={(e) => setPasswordValue(e.target.value)}
                    onBlur={() => handleBlur('password')}
                    placeholder="••••••••"
                    data-testid="password-input"
                    aria-invalid={touched.password && errors.password ? 'true' : 'false'}
                    aria-describedby={touched.password && errors.password ? 'password-error' : undefined}
                    className={touched.password && errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="password-visibility-toggle"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                  </button>
                </div>
                {touched.password && errors.password && (
                  <p id="password-error" className="text-destructive text-sm mt-1" data-testid="password-error">{errors.password}</p>
                )}
                <PasswordRequirements password={passwordValue} />
              </div>
              
              <div className="space-y-1.5 relative">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPasswordValue}
                    onChange={(e) => setConfirmPasswordValue(e.target.value)}
                    onBlur={() => handleBlur('confirmPassword')}
                    placeholder="••••••••"
                    data-testid="confirm-password-input"
                    aria-invalid={touched.confirmPassword && errors.confirmPassword ? 'true' : 'false'}
                    aria-describedby={touched.confirmPassword && errors.confirmPassword ? 'confirm-password-error' : undefined}
                    className={touched.confirmPassword && errors.confirmPassword ? 'border-red-500 pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    data-testid="confirm-password-visibility-toggle"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                  </button>
                </div>
                {touched.confirmPassword && errors.confirmPassword && (
                  <p id="confirm-password-error" className="text-destructive text-sm mt-1" data-testid="confirm-password-error">{errors.confirmPassword}</p>
                )}
              </div>
              
              {userType === UserType.CORPORATE && userManagement.corporateUsers.enabled && (
                <div className="space-y-4 border p-4 rounded-md">
                  <h3 className="font-medium">Company Information</h3>
                  <div className="space-y-1.5">
                    <Label htmlFor="companyName">Company Name*</Label>
                    <Input
                      id="companyName"
                      type="text"
                      placeholder="Company Name"
                      data-testid="company-name-input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="position">Position</Label>
                      <Input
                        id="position"
                        type="text"
                        placeholder="Your Position"
                        data-testid="position-input"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        type="text"
                        placeholder="Your Department"
                        data-testid="department-input"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="companySize">Company Size</Label>
                      <select
                        id="companySize"
                        data-testid="company-size-select"
                        className="input"
                      >
                        <option value="">Select size</option>
                        <option value="1-10">1-10</option>
                        <option value="11-50">11-50</option>
                        <option value="51-200">51-200</option>
                        <option value="201-500">201-500</option>
                        <option value="501-1000">501-1000</option>
                        <option value="1000+">1000+</option>
                        <option value="Other/Not Specified">Other/Not Specified</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="industry">Industry</Label>
                      <select
                        id="industry"
                        data-testid="industry-select"
                        className="input"
                      >
                        <option value="">Select industry</option>
                        <option value="Technology">Technology</option>
                        <option value="Finance">Finance</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Education">Education</option>
                        <option value="Retail">Retail</option>
                        <option value="Other/Not Specified">Other/Not Specified</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="items-top flex space-x-2 pt-2"> 
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    aria-label="Accept terms and conditions and privacy policy"
                    checked={acceptTermsValue}
                    onChange={(e) => setAcceptTermsValue(e.target.checked)}
                    onBlur={() => handleBlur('acceptTerms')}
                    data-testid="accept-terms-checkbox"
                    aria-invalid={touched.acceptTerms && errors.acceptTerms ? 'true' : 'false'}
                    aria-describedby={touched.acceptTerms && errors.acceptTerms ? 'terms-error' : undefined}
                    className="w-4 h-4 text-primary bg-background border-primary rounded focus:ring-primary cursor-pointer"
                  />
                </div>
                <div className="grid gap-1.5 leading-none"> 
                  <label 
                    htmlFor="acceptTerms" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    data-testid="terms-label"
                  >
                    I accept the <a href="/terms" target="_blank" rel="noopener noreferrer" data-testid="terms-link">Terms and Conditions</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" data-testid="privacy-link">Privacy Policy</a>
                  </label>
                  {touched.acceptTerms && errors.acceptTerms && (
                    <p id="terms-error" className="text-destructive text-sm mt-1" data-testid="terms-error">{errors.acceptTerms}</p>
                  )}
                </div>
              </div>
              
              <Button 
                type="submit"
                className="w-full" 
                disabled={!isValid || isSubmitting} 
                data-testid="submit-button"
              >
                {isSubmitting ? "Creating Account..." : "Create Account"}
              </Button>
              
              <OAuthButtons mode="signup" layout="vertical" className="mb-6 mt-2" />
              
              <p className="text-center text-sm text-muted-foreground mt-6">
                Already have an account? <a href="/login" className="font-medium text-primary underline underline-offset-4 hover:text-primary/90">Sign in</a>
              </p>
            </form>
          )}
        />
      )}
      
      {shouldRedirect && apiSuccess && (
        <Alert variant="default" className="bg-green-100 border-green-300 text-green-800 mt-4" role="alert">
          <Check className="h-4 w-4" />
          <AlertTitle>Success!</AlertTitle>
          <AlertDescription>{apiSuccess}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}