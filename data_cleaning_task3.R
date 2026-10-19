library(jsonlite)
library(dplyr)

data <- fromJSON("data.json")


missing_node_ids <- data$nodes %>% filter(is.na(id))
print(paste("Nodes with missing IDs:", nrow(missing_node_ids)))

missing_names <- data$nodes %>% filter(is.na(name))
print(paste("Number of nodes with missing names:", nrow(missing_names)))

missing_genres <- data$nodes %>% filter(`Node Type` %in% c("Song", "Album") & is.na(genre))
print(paste("Projects with missing genre:", nrow(missing_genres)))

self_loop_nodes <- data$links %>% filter (source == target)
print(paste("Nodes pointing to themselves:", nrow(self_loop_nodes)))

overlap_dates <- data$nodes %>% filter(`Node Type` %in% c("Song", "Album") & !is.na(release_date) & !is.na(written_date)) %>%
  filter(as.numeric(release_date) < as.numeric(written_date))
print(paste("Projects with release before written:", nrow(overlap_dates)))

valid_ids <- data$nodes$id
false_links <- data$links %>% filter(!(source %in% valid_ids) | !(target %in% valid_ids))
print(paste("Links pointing to false nodes:", nrow(false_links)))

chart_before_release <- data$nodes %>% filter(!is.na(notoriety_date) & !is.na(release_date)) %>%
  filter(as.numeric(notoriety_date) < as.numeric(release_date))
print(paste("Projects that charted before they were released:", nrow(chart_before_release)))

linked_ids <- unique(c(data$links$source, data$links$target))
orphan_nodes <- data$nodes %>% filter(!(id %in% linked_ids))
print(paste("Orphan nodes:", nrow(orphan_nodes)))

duplicate_node_ids <- data$nodes %>% filter(duplicated(id))
print(paste("Duplicate node IDs:", nrow(duplicate_node_ids)))

duplicate_links <- data$links %>% filter(duplicated(paste(source, target, `Edge Type`)))
print(paste("Duplicate linking edges:", nrow(duplicate_links)))

links <- data$links

links <- links %>% filter(source != target) 

links <- links %>% distinct(source, target, `Edge Type`, .keep_all = TRUE) 

clean_dataset <- list(nodes = data$nodes, links = links)

saveRDS(clean_dataset, "clean_data.rds")
print("Successfully cleaned and saved to clean_data.rds!")