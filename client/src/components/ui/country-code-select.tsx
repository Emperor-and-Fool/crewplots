import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { countryCodes, type CountryCode } from "@/lib/country-codes";
import { Label } from "@/components/ui/label";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";

interface CountryCodeSelectProps {
  form: UseFormReturn<any>;
  name: string;
  label?: string;
  required?: boolean;
}

export function CountryCodeSelect({ form, name, label = "Country Code", required = false }: CountryCodeSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCountries, setFilteredCountries] = useState(countryCodes);
  const [isOpen, setIsOpen] = useState(false);

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

  // Default to United States (+1)
  useEffect(() => {
    if (!form.getValues(name)) {
      const defaultCountry = countryCodes.find(country => country.code === "US");
      if (defaultCountry) {
        form.setValue(name, defaultCountry.dialCode);
      }
    }
  }, [form, name]);

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}{required && <span className="text-red-500 ml-1">*</span>}</FormLabel>}
          <FormControl>
            <Select
              value={field.value}
              onValueChange={field.onChange}
              onOpenChange={(open) => setIsOpen(open)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a country code" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <div className="p-2">
                    <input
                      className="w-full p-2 border rounded-md mb-2"
                      placeholder="Search country or code..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {filteredCountries.map((country) => (
                      <SelectItem key={country.code} value={country.dialCode}>
                        <div className="flex items-center gap-2">
                          <span>{country.flag}</span>
                          <span>{country.name}</span>
                          <span className="text-gray-500 ml-1">{country.dialCode}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                </SelectGroup>
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}