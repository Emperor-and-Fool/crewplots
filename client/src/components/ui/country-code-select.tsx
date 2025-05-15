import { useState, useEffect, forwardRef } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { countryCodes, type CountryCode } from "@/lib/country-codes";
import { Input } from "@/components/ui/input";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import { ChevronDown } from "lucide-react";

interface CountryCodeSelectProps {
  form: UseFormReturn<any>;
  name: string;
  label?: string;
  required?: boolean;
}

// Integrated phone input component with country code
export function CountryCodeSelect({ form, name, label = "Phone Number", required = false }: CountryCodeSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCountries, setFilteredCountries] = useState(countryCodes);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode | null>(null);
  const [phoneValue, setPhoneValue] = useState("");
  const [countryCodeValue, setCountryCodeValue] = useState("+31"); // Default to Netherlands

  // Filter countries based on search query
  useEffect(() => {
    if (!searchQuery) {
      setFilteredCountries(countryCodes);
      return;
    }

    const filtered = countryCodes.filter(
      (country) =>
        country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        country.dialCode.includes(searchQuery)
    );
    setFilteredCountries(filtered);
  }, [searchQuery]);

  // Default to Netherlands (+31)
  useEffect(() => {
    const defaultCountry = countryCodes.find(country => country.code === "NL");
    if (defaultCountry) {
      setCountryCodeValue(defaultCountry.dialCode);
      setSelectedCountry(defaultCountry);
    }
  }, []);

  // Get existing phone number if it exists
  useEffect(() => {
    const currentPhoneNumber = form.getValues(name);
    if (currentPhoneNumber) {
      // Parse the existing phone number format: +xx xxxxxxx
      const parts = currentPhoneNumber.split(' ');
      if (parts.length === 2) {
        // Extract country code from the formatted number
        const extractedCountryCode = parts[0];
        const country = countryCodes.find(c => c.dialCode === extractedCountryCode);
        if (country) {
          setSelectedCountry(country);
          setCountryCodeValue(extractedCountryCode);
        }
        // Extract the phone part
        setPhoneValue(parts[1]);
      }
    }
  }, [form, name]);

  // Update the form value when either country code or phone changes
  useEffect(() => {
    if (selectedCountry && phoneValue) {
      // Format: +xx xxxxxxx
      const formattedPhoneNumber = `${countryCodeValue} ${phoneValue}`;
      form.setValue(name, formattedPhoneNumber);
    }
  }, [countryCodeValue, phoneValue, form, name, selectedCountry]);

  // Handle phone input change
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers, remove leading 0
    const sanitized = value.replace(/[^0-9]/g, '').replace(/^0+/, '');
    
    // For Netherlands, limit to 9 digits
    if (selectedCountry?.code === 'NL' && sanitized.length > 9) {
      return;
    }
    
    setPhoneValue(sanitized);
  };

  // Handle country code selection
  const handleCountryCodeChange = (value: string) => {
    setCountryCodeValue(value);
    const country = countryCodes.find(c => c.dialCode === value);
    if (country) {
      setSelectedCountry(country);
    }
  };

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-2">
          {label && <FormLabel>{label}{required && <span className="text-red-500 ml-1">*</span>}</FormLabel>}
          <div className="flex">
            <div className="relative flex items-center w-full">
              <div className="absolute left-0 top-0 bottom-0 flex items-center">
                <Select
                  value={countryCodeValue}
                  onValueChange={handleCountryCodeChange}
                >
                  <SelectTrigger className="h-10 border-0 !bg-transparent w-[100px] pl-3 pr-0 focus:ring-0">
                    <div className="flex items-center space-x-1 text-xs font-medium">
                      <span className="text-lg">{selectedCountry?.flag}</span>
                      <span className="ml-1">{selectedCountry?.dialCode}</span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <div className="p-2">
                        <input
                          className="w-full p-2 border rounded-md mb-2"
                          placeholder="Search country..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        {filteredCountries.map((country) => (
                          <SelectItem key={`${country.code}-${country.dialCode}`} value={country.dialCode}>
                            <div className="flex items-center gap-2">
                              <span className="text-lg mr-1">{country.flag}</span>
                              <span className="text-sm">{country.name}</span>
                              <span className="text-gray-500 ml-1">{country.dialCode}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <FormControl>
                <Input
                  placeholder="612345678"
                  className="pl-[90px] h-10"
                  value={phoneValue}
                  onChange={handlePhoneChange}
                  onBlur={field.onBlur}
                  type="tel"
                />
              </FormControl>
            </div>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}