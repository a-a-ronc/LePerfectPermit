import React from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Define commodities schema
const commoditiesSchema = z.object({
  commodityTypes: z.array(z.string()).min(1, "Select at least one commodity type"),
  storageMethod: z.string().min(1, "Storage method is required"),
  classification: z.string().min(1, "Classification is required"),
  additionalDetails: z.string().optional(),
});

interface CommoditiesFormProps {
  projectId: number;
  existingData: any | null;
  isLoading?: boolean;
}

export function CommoditiesForm({
  projectId,
  existingData,
  isLoading = false,
}: CommoditiesFormProps) {
  const { toast } = useToast();
  
  const commodityTypeOptions = [
    { id: "paper", label: "Paper Products (Class III)" },
    { id: "wood", label: "Wood Products (Class III)" },
    { id: "textiles", label: "Textiles (Class III)" },
    { id: "furniture", label: "Furniture (Class IV)" },
    { id: "plastic", label: "Plastics (Group A)" },
    { id: "rubber", label: "Rubber (Group A)" },
    { id: "electronics", label: "Electronics (Group A)" },
    { id: "food", label: "Food Products (Class I)" },
    { id: "metal", label: "Metal Products (Class I)" },
    { id: "glass", label: "Glass Products (Class I)" },
    { id: "other", label: "Other" },
  ];
  
  const storageMethodOptions = [
    { id: "pallets", label: "Palletized Storage" },
    { id: "racks", label: "Rack Storage" },
    { id: "solid_pile", label: "Solid Pile Storage" },
    { id: "shelves", label: "Shelf Storage" },
    { id: "bins", label: "Bin Box Storage" },
    { id: "back_to_back", label: "Back-to-Back Shelf Storage" },
  ];
  
  const classificationOptions = [
    { id: "class_i", label: "Class I - Noncombustible" },
    { id: "class_ii", label: "Class II - Limited Combustible" },
    { id: "class_iii", label: "Class III - Combustible" },
    { id: "class_iv", label: "Class IV - Limited High-Hazard" },
    { id: "group_a_exposed", label: "Group A Plastics - Exposed" },
    { id: "group_a_unexposed", label: "Group A Plastics - Unexposed" },
    { id: "mixed", label: "Mixed Commodities" },
  ];
  
  // Set up form with existing data if available
  const form = useForm<z.infer<typeof commoditiesSchema>>({
    resolver: zodResolver(commoditiesSchema),
    defaultValues: {
      commodityTypes: existingData?.commodityTypes || [],
      storageMethod: existingData?.storageMethod || "",
      classification: existingData?.classification || "",
      additionalDetails: existingData?.additionalDetails || "",
    },
  });
  
  // Save commodities mutation
  const saveCommoditiesMutation = useMutation({
    mutationFn: async (values: z.infer<typeof commoditiesSchema>) => {
      const formattedValues = {
        projectId,
        commodityTypes: values.commodityTypes,
        storageMethod: values.storageMethod,
        classification: values.classification,
        additionalDetails: values.additionalDetails,
      };
      
      // Use PUT if updating, POST if creating
      const method = existingData ? "PATCH" : "POST";
      const endpoint = existingData 
        ? `/api/projects/${projectId}/commodities/${existingData.id}` 
        : `/api/projects/${projectId}/commodities`;
      
      const res = await apiRequest(method, endpoint, formattedValues);
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate multiple queries to ensure UI updates properly
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/commodities`] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] }); // Refresh project list
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] }); // Refresh project details
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/activities`] }); // Refresh activity log
      
      toast({
        title: "Commodities Information Saved",
        description: "The commodities information has been saved successfully.",
      });
      
      // Force page reload to ensure all components show the latest data
      setTimeout(() => {
        window.location.reload();
      }, 1500); // Delay to allow the toast to be visible
    },
    onError: () => {
      toast({
        title: "Failed to Save",
        description: "There was an error saving the commodities information. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (values: z.infer<typeof commoditiesSchema>) => {
    saveCommoditiesMutation.mutate(values);
  };
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-32 ml-auto" />
      </div>
    );
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="commodityTypes"
          render={() => (
            <FormItem>
              <FormLabel>Commodity Types</FormLabel>
              <FormDescription>
                Select all commodity types that will be stored in this facility.
              </FormDescription>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                {commodityTypeOptions.map((option) => (
                  <FormField
                    key={option.id}
                    control={form.control}
                    name="commodityTypes"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={option.id}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(option.id)}
                              onCheckedChange={(checked) => {
                                const currentValue = field.value || [];
                                return checked
                                  ? field.onChange([...currentValue, option.id])
                                  : field.onChange(
                                      currentValue.filter((value) => value !== option.id)
                                    );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal cursor-pointer">
                            {option.label}
                          </FormLabel>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="storageMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Storage Method</FormLabel>
                <FormDescription>
                  Select the primary method used to store commodities.
                </FormDescription>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select storage method" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {storageMethodOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="classification"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Commodity Classification</FormLabel>
                <FormDescription>
                  Select the commodity classification based on IFC Chapter 32.
                </FormDescription>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select classification" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {classificationOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="additionalDetails"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Details</FormLabel>
              <FormDescription>
                Provide any additional details about the commodities or storage arrangements.
              </FormDescription>
              <FormControl>
                <Textarea
                  placeholder="Enter additional details about commodities and storage..."
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={saveCommoditiesMutation.isPending}
          >
            {saveCommoditiesMutation.isPending 
              ? "Saving..." 
              : existingData 
                ? "Update Commodities Information" 
                : "Save Commodities Information"
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}
